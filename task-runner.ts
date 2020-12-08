const tc = require('@actions/tool-cache');
const needle = require('needle')
const http = require('http');
const fs = require('fs');
const pkg = require('./package.json');
const { exec } = require("child_process");

const os = 'Darwin';

const filepath = 'mfva_1.0.apk';

interface AppknoxBinaryConfig {
    name: string,
    path: string,
    copyToBin(src: string, perm: string): void;
}
type OSAppknoxBinaryMap = Record<string, AppknoxBinaryConfig>

const supportedOS: OSAppknoxBinaryMap = {
    'Linux': {
        name: "appknox-Linux-x86_64",
        path: "/usr/local/bin/appknox",
        copyToBin(src: string, perm: string) {
            try {
                fs.copyFileSync(src, this.path);
                return fs.chmodSync(this.path, perm);
            } catch (error) {
                console.error('error', error)
                throw error;
            }
        }
    },
    'Darwin': {
        name: "appknox-Darwin-x86_64",
        path: "/usr/local/bin/appknox",
        copyToBin(src: string, perm: string) {
            try {
                fs.copyFileSync(src, this.path);
                return fs.chmodSync(this.path, perm);
            } catch (error) {
                console.error('error', error)
                throw error;
            }
        }
    },
}

/**
 * Gets appknox binary download url
 * @param os
 * @returns url
 */
function getAppknoxDownloadURL(os: string): string {
    if (!(os in supportedOS)) {
        throw Error(`Unsupported os ${os}`);
    }
    const binaryVersion = pkg.binary;
    const binaryName = supportedOS[os].name;
    return `https://github.com/appknox/appknox-go/releases/download/${binaryVersion}/${binaryName}`;
}


/**
 * Downloads file to the specified destination
 * Destination: env.RUNNER_TEMP
 * @param url
 */
async function downloadFile(url: string): Promise<string> {
    try {
        const file = await tc.downloadTool(url);
        console.debug('File downloaded in ', file)
        return file;
    } catch (error: any) {
        console.error('Error:File Download:', error);
        throw error;
    }
}

/**
 * Download & install appknox binary
 * @param os
 * @returns appknox binary path
 */
async function installAppknox(os: string): Promise<string> {
    if (!(os in supportedOS)) {
        throw Error(`Unsupported os ${os}`);
    }
    const url = getAppknoxDownloadURL(os);

    const downloadedPath = await downloadFile(url);
    console.debug(`Downloading appknox binary from ${url} to ${downloadedPath}`);


    if (!fs.existsSync(downloadedPath)) {
        throw Error("Could not download appknox binary");
    }

    console.debug("Download finished");

    supportedOS[os].copyToBin(downloadedPath, "755");
    console.debug(`Appknox installation completed: ${supportedOS[os].path}`);

    return supportedOS[os].path;
}

async function upload(filepath: string) {
    console.debug(`Filepath: ${filepath}`);

    try {
        await installAppknox(os);
        // Execute 'appknox upload ${filepath}' command
        exec(`appknox upload ${filepath}`, (error: any, stdout: number) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }
            console.debug(`File ID: ${stdout}`);
        });

    } catch (err) {
        console.error('Upload Error: ', err);
        throw err;
    }
}


upload(filepath);