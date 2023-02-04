import * as vscode from 'vscode';
import { DOCKER_BINDING_DIR, DOCKER_WORK_DIR } from './constants/docker';
import ContainerHandler from './utils/container-handler';
import Project from './utils/project';

class ClientStubsGenerator {
  wsdl: URL | string;
  project: Project | undefined;
  containerHandler: ContainerHandler;

  constructor(wsdl: URL | string) {
    this.wsdl = wsdl;
    this.containerHandler = new ContainerHandler();
  }

  async initializeProject(): Promise<void> {
    const project = new Project(this.wsdl);
    await project.initialize();
    this.project = project;
  }

  async generateClientStubs(): Promise<boolean> {
    if (!this.project) {
      throw new Error('Project not initialized');
    }

    const wsimportCommand = this._buildWsimportCommand();
    try {
      await this.containerHandler.launchContainer();
      if (this.project.bindingFilePaths) {
        await this.containerHandler.copyBindingFilesToContainer(
          this.project.bindingFilePaths
        );
      }
      await this.containerHandler.generateCodeInContainer(wsimportCommand);
      await this.containerHandler.copyGeneratedCodeToHost(
        this.project.javaDirectoryPath
      );
      await this.containerHandler.formatGeneratedCode(
        this.project.javaDirectoryPath
      );
      return true;
    } catch (error: any) {
      if (this.containerHandler.containerId) {
        this.containerHandler.stopContainer();
      }
      vscode.window.showErrorMessage(error?.message ?? error);
      return false;
    }
  }

  _buildWsimportCommand(): string {
    const wsimport = '/opt/ibm/wlp/bin/jaxws/wsimport';
    const wsdl = this.project?.wsdl?.soapAddressUrl;
    const packageName = this.project?.wsdl?.packageName;
    const bindingArgs = this._buildBindingArgs();

    return `${wsimport} -target 2.2 -quiet ${bindingArgs} ${DOCKER_WORK_DIR} -p ${packageName} -Xnocompile ${wsdl}`;
  }

  _buildBindingArgs(): string {
    const bindingArgs: string[] = [];
    this.project?.bindingFilePaths?.forEach((bindingFile, index) => {
      const basename = bindingFile.split('/')?.pop() ?? `binding_${index}`;
      bindingArgs.push(`-b ${DOCKER_BINDING_DIR}/${basename}`);
    });
    return bindingArgs.join(' ');
  }
}

export default ClientStubsGenerator;
