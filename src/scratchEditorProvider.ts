import * as vscode from "vscode";
import { getNonce } from "./utils";
interface ScratchDocument {
  scratches: ScratchDocumentItem[];
}

interface ScratchDocumentItem{
  id: string;
  text: string;
  created: number;
}
export class ScratchEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new ScratchEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      ScratchEditorProvider.viewType,
      provider
    );
  }

  private static readonly viewType = "scratch-editor-drawer.scratchEditor";

	private static readonly scratchCharacters = ['😸', '😹', '😺', '😻', '😼', '😽', '😾', '🙀', '😿', '🐱'];


  constructor(private readonly context: vscode.ExtensionContext) {}

  private getHtmlForWebview(webview: vscode.Webview): string {
    // Local path to script and css for the webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "scratch.js")
    );

    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "reset.css")
    );

    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "vscode.css")
    );

    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "media", "catScratch.css")
    );
    const nonce = getNonce();
    return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <!--
            Use a content security policy to only allow loading images from https or from our extension directory,
            and only allow scripts that have a specific nonce.
            -->
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <link href="${styleResetUri}" rel="stylesheet" />
            <link href="${styleVSCodeUri}" rel="stylesheet" />
            <link href="${styleMainUri}" rel="stylesheet" />

            <title>Cat Scratch</title>
        </head>
        <body>
            <div class="notes">
                <div class="add-button">
                    <button>Scratch!</button>
                </div>
            </div>
            
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    console.log("resolveCustomTextEditor", document.uri.toString());
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // Update view when document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });


    webviewPanel.webview.onDidReceiveMessage((e) => {
      console.log("Received message from the webview", e);
      switch (e.type) {
        case "add":
          vscode.window.showInformationMessage("Add button clicked");
          this.addNewScratch(document);
          break;
        case "delete":
          vscode.window.showInformationMessage("Delete button clicked");
          this.deleteScratch(document, e.id);
          break;
      }
    });

    function updateWebview() {
      webviewPanel.webview.postMessage({
        type: "update",
        text: document.getText(),
      });
    }

    updateWebview();
  }

  addNewScratch(document: vscode.TextDocument) {
    console.log("addNewScratch", document.uri.toString());
    const dataJson = this.getDocumentAsJson(document);
    const character = ScratchEditorProvider.scratchCharacters[Math.floor(Math.random() * ScratchEditorProvider.scratchCharacters.length)]; 
    dataJson.scratches = [
      ...dataJson.scratches,
      {
        id: getNonce(),
        text: character,
        created: Date.now(),
      },
    ];

    return this.updateTextDocument(document, dataJson);
  }

  deleteScratch(document: vscode.TextDocument, id: string) {
    console.log("deleteScratch", document.uri.toString());
    const dataJson = this.getDocumentAsJson(document);
    dataJson.scratches = dataJson.scratches.filter((item) => item.id !== id);
    return this.updateTextDocument(document, dataJson);
  }

  getDocumentAsJson(document: vscode.TextDocument): ScratchDocument {
		const text = document.getText();
		if (text.trim().length === 0) {
			return {} as ScratchDocument;
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error('Could not get document as json. Content is not valid json');
		}
	}

  updateTextDocument(document: vscode.TextDocument, data: ScratchDocument): Thenable<boolean> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      JSON.stringify(data, null, 2)
    );
    return vscode.workspace.applyEdit(edit);
  }

}
