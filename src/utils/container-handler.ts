import { exec } from 'child_process';
import {
  DOCKER_IMAGE_NAME,
  DOCKER_WORK_DIR,
  DOCKER_BINDING_DIR,
  DOCKERFILES,
} from '../constants/docker';

const DOCKER_DIR = `${__dirname}/../docker`;

const _exec = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(error.message);
        reject(error.message);
      }
      resolve(stdout ? stdout : stderr);
    });
  });
};

class ContainerHandler {
  containerId: string | undefined;

  public async launchContainer(): Promise<void> {
    if (!Boolean(await this._doesImageExist())) {
      await this._buildImage();
    }

    const command = `docker run -it --rm --detach ${DOCKER_IMAGE_NAME}`;

    const result = await _exec(command);
    if (!result) {
      throw new Error('Failed to launch container.');
    }

    this.containerId = result.trim();
  }

  public async copyBindingFilesToContainer(
    bindingFilePaths: string[]
  ): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container not launched.');
    }
    if (bindingFilePaths.length === 0) {
      return;
    }

    const commands = bindingFilePaths.map((bindingFilePath, index) => {
      const basename = bindingFilePath.split('/')?.pop() ?? `binding_${index}`;
      return `docker cp ${bindingFilePath} ${this.containerId}:${DOCKER_BINDING_DIR}/${basename}`;
    });

    const result = await _exec(
      `${commands.join(' && ')} && echo "got em copied"`
    );
    if (!result.includes('got em copied')) {
      this.stopContainer();
      throw new Error('Failed to copy binding files to container.');
    }
  }

  public async generateCodeInContainer(wsimportCommand: string): Promise<void> {
    if (!this.containerId) {
      throw new Error('Container not launched.');
    }

    const command = `docker exec ${this.containerId} ${wsimportCommand} && echo "got em generated"`;

    const result = await _exec(command);
    if (!result.includes('got em generated')) {
      this.stopContainer();
      throw new Error('Failed to generate code in container.');
    }
  }

  public async copyGeneratedCodeToHost(hostPath: string): Promise<void> {
    const copyCommand = `docker cp ${this.containerId}:${DOCKER_WORK_DIR}/. ${hostPath}`;
    const ownCopiedFilesCommand = `chown -R $USERNAME:$USERNAME ${hostPath}`;

    const result = await _exec(
      `${copyCommand} && ${ownCopiedFilesCommand} && echo "got em copied"`
    );
    if (!result.includes('got em copied')) {
      this.stopContainer();
      throw new Error('Failed to copy generated code to host.');
    }
  }

  public async formatGeneratedCode(hostPath: string): Promise<void> {
    const command = `prettier --write ${hostPath} && echo "got em formatted"`;

    const result = await _exec(command);
    if (!result.includes('got em formatted')) {
      this.stopContainer();
      throw new Error('Failed to format generated code.');
    }
  }

  public async stopContainer(): Promise<void> {
    const command = `docker stop ${this.containerId} && echo "got it stopped"`;

    const result = await _exec(command);
    if (!result.includes('got it stopped')) {
      throw new Error('Failed to stop container.');
    }

    this.containerId = undefined;
  }

  private async _doesImageExist(): Promise<boolean> {
    const command = `docker image ls ${DOCKER_IMAGE_NAME} --format "{{.ID}}"`;
    return Boolean(await _exec(command));
  }

  private async _buildImage(): Promise<void> {
    const commands = DOCKERFILES.map(({ filename, imagename }) => {
      return `docker build -t ${imagename} -f ${DOCKER_DIR}/${filename} ${DOCKER_DIR}`;
    });

    const result = await _exec(
      `${commands.join(' && ')} && echo "got it built"`
    );

    if (!result?.includes('got it built')) {
      throw new Error('Failed to build image.');
    }
  }
}

export default ContainerHandler;
