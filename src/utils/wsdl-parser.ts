import * as fs from 'fs';
import * as xml2json from 'xml2json';

class WsdlParser {
  private _filePath: string;
  private _contents: { [key: string]: any };

  constructor(wsdlFilePath: string) {
    this._filePath = wsdlFilePath;
    this._contents = this._getWsdlContentsAsJson();
  }

  public get packageName(): string {
    try {
      const tnsUrl = new URL(this._targetNamespace);
      const hostnameReversed = tnsUrl.hostname.split('.').reverse().join('.');
      let pathname = tnsUrl.pathname.replace(/\//g, '.');
      if (pathname.endsWith('.')) {
        pathname = pathname.slice(0, -1);
      }
      return (hostnameReversed + pathname).toLowerCase();
    } catch (e) {
      throw new Error(
        'Failed to parse targetNamespace from WSDL when attempting to build package name.'
      );
    }
  }

  private get _targetNamespace(): string {
    return (
      this._contents?.['wsdl:definitions']?.targetNamespace ??
      this._contents?.definitions?.targetNamespace
    );
  }

  public get serviceName(): string {
    return (
      this._contents?.['wsdl:definitions']?.['wsdl:service']?.name ??
      this._contents?.definitions?.service?.name
    );
  }

  public get soapAddressUrl(): string {
    //.wso files have a different structure than .wsdl files
    //TODO: Add support for other WSDL file types?
    const wsdlService =
      this._contents?.['wsdl:definitions']?.['wsdl:service'] ??
      this._contents?.definitions?.service;
    let wsdlPort = wsdlService?.['wsdl:port'] ?? wsdlService?.port;
    if (wsdlPort?.length > 1) {
      wsdlPort = wsdlPort?.[0];
    }
    const url =
      wsdlPort?.['soap:address']?.location ??
      wsdlService?.port?.address?.location;
    if (!url) {
      throw new Error('Failed to parse soap address URL from WSDL.');
    }

    return `${url}/${this._wsdlFileNameOnServer}.wsdl`;
  }

  private get _wsdlFileNameOnServer(): string {
    return (
      this._contents?.['wsdl:definitions']?.name ??
      this._contents?.definitions?.name
    );
  }

  private _getWsdlContentsAsJson(): { [key: string]: any } {
    try {
      const contents = fs.readFileSync(this._filePath, 'utf8');
      return xml2json.toJson(contents, { object: true });
    } catch (e) {
      throw new Error(`Failed to parse local WSDL file: ${this._filePath}.`);
    }
  }
}

export default WsdlParser;
