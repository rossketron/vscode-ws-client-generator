import * as vscode from "vscode";
import ClientStubsGenerator from "./client-stubs-generator";

async function generateClientStubs(wsdl: URL | string): Promise<void> {
  const generator = new ClientStubsGenerator(wsdl);
  await generator.initializeProject();
  const generatedSuccessfully = await generator.generateClientStubs();
  if (generatedSuccessfully) {
    vscode.window.showInformationMessage("Client stubs generated successfully");
  } else {
    vscode.window.showErrorMessage("Failed to generate client stubs");
  }
}

async function generateClientStubsFromUrl(): Promise<void> {
  let _url: URL | undefined;
  vscode.window
    .showInputBox({
      placeHolder: "Enter the URL of the WSDL file",
    })
    .then((url) => {
      try {
        _url = new URL(`${url}?WSDL`);
      } catch (e) {
        vscode.window.showErrorMessage("Invalid URL");
        return;
      }
      generateClientStubs(_url);
    });
}

export function activate(context: vscode.ExtensionContext) {
  const outputDisposable = vscode.window.createOutputChannel(
    "ws-client-generator"
  );

  const genFromFileDisosable = vscode.commands.registerCommand(
    "ws-client-generator.generateClientStubsFromFile",
    (args) => generateClientStubs(args.fsPath)
  );

  const genFromUrlDisosable = vscode.commands.registerCommand(
    "ws-client-generator.generateClientStubsFromUrl",
    () => generateClientStubsFromUrl()
  );

  context.subscriptions.push(
    genFromFileDisosable,
    genFromUrlDisosable,
    outputDisposable
  );
}

export function deactivate() {}
