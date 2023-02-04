import * as axios from 'axios';
import * as glob from 'glob';
import { TextEncoder } from 'util';
import * as vscode from 'vscode';
import WsdlParser from './wsdl-parser';
import { TMP_DIR_NAME } from '../constants/file-system';

class Project {
  public name: string;
  public wsdl: WsdlParser | undefined;
  public wsdlFilePath: string;
  public wsdlUrl: URL | undefined;
  public javaDirectoryPath: string;
  public bindingFilePaths: string[] | undefined;
  private workspaceFolder: vscode.WorkspaceFolder;

  constructor(wsdl: URL | string) {
    this.workspaceFolder = this._getProjectWorkspaceFolder();
    this.name = this.workspaceFolder.name;
    this.javaDirectoryPath = this._getJavaDirectory();

    if (typeof wsdl === 'string') {
      this.wsdlFilePath = wsdl;
    } else {
      this.wsdlUrl = wsdl;
      this.wsdlFilePath = this._getWsdlFilePath(wsdl);
    }
  }

  public async initialize(): Promise<void> {
    this.bindingFilePaths = await this._getBindingFilePaths();
    await this.initializeWsdl();
  }

  public async initializeWsdl() {
    if (this.wsdlUrl) {
      const wsdlNotInProject = !this.wsdlFilePath.includes(TMP_DIR_NAME);
      await this._upsertWsdlFileInProject(this.wsdlUrl, wsdlNotInProject);
    }

    this.wsdl = new WsdlParser(this.wsdlFilePath);
  }

  private _getProjectWorkspaceFolder(): vscode.WorkspaceFolder {
    if (!vscode.workspace.workspaceFolders) {
      throw new Error('No workspace project folders found');
    }

    if (vscode.workspace.workspaceFolders.length > 1) {
      //TODO: Add support for multiple projects in workspace
      throw new Error(
        `More than one workspace project folder found. This is not supported yet.
        ...Please try again with only the target project in the workspace.`
      );
    }

    return vscode.workspace.workspaceFolders[0];
  }

  private _getWsdlFilePath(wsdl: URL): string {
    const wsdlFileName = wsdl.pathname.split('/').pop();
    const workspaceFolderPath = this.workspaceFolder.uri.fsPath;

    return (
      glob.sync(`${workspaceFolderPath}/**/${wsdlFileName}`)?.[0] ??
      `${workspaceFolderPath}/${TMP_DIR_NAME}/${wsdlFileName}`
    );
  }

  private async _upsertWsdlFileInProject(
    wsdl: URL,
    wsdlNotInProject: boolean
  ): Promise<void> {
    const tmpDir = vscode.Uri.joinPath(this.workspaceFolder.uri, TMP_DIR_NAME);
    if (wsdlNotInProject) {
      await vscode.workspace.fs.createDirectory(tmpDir);
    }

    const wsdlFile = vscode.Uri.file(this.wsdlFilePath);
    const wsdlFromServer = await this._getWsdlFileContent(wsdl);

    if (!wsdlFromServer) {
      if (wsdlNotInProject) {
        await vscode.workspace.fs.delete(tmpDir, { recursive: true });
        throw new Error(
          `Error while fetching wsdl file from server.
          ...Please add the wsdl file to the workspace and try again.`
        );
      }
      vscode.window.showWarningMessage(
        `Error while updating local WSDL contents from server.
        ...Continuing to generate using WSDL URL.
        ...Please update the local WSDL file manually if needed.`
      );
      return;
    }

    await vscode.workspace.fs.writeFile(wsdlFile, wsdlFromServer);
  }

  private async _getWsdlFileContent(
    wsdlUrl: URL
  ): Promise<Uint8Array | undefined> {
    try {
      const response = await axios.default.get(wsdlUrl.href);
      const wsdlContentsFromServer: string = response.data;
      return new TextEncoder().encode(wsdlContentsFromServer);
    } catch (error) {
      // Don't allow failed wsdl update to stop the generation process here
      // Handle this in the calling function
      return undefined;
    }
  }

  private async _getBindingFilePaths(): Promise<string[]> {
    const bindingFilePaths = glob.sync(
      `${this.workspaceFolder.uri.fsPath}/**/binding/*.xml`
    );
    if (bindingFilePaths.length === 0) {
      return [];
    }
    const selection = await vscode.window.showQuickPick(bindingFilePaths, {
      canPickMany: true,
      placeHolder: 'Select binding files to use for generation',
      ignoreFocusOut: true,
    });
    return selection ?? [];
  }

  private _getJavaDirectory(): string {
    const javaDir = glob
      .sync(`${this.workspaceFolder.uri.fsPath}/**/src/main/java`)
      ?.filter((dir) => !dir.includes('interface'))[0];

    if (!Boolean(javaDir)) {
      throw new Error('No java directory found in the project workspace');
    }

    return javaDir;
  }
}

export default Project;
