import fs from "fs";
import path from "path";
import readline from "readline";

interface LibraryMetadata {
    version: string;
    filePath: string;
}

async function getLibraryVersion(filePath: string): Promise<string | null> {
    const versionPattern = /declare\s+version\s+"([\d\.]+)"/;
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        const match = versionPattern.exec(line);
        if (match) {
            return match[1];
        }
    }
    return null;
}

async function extractLibraryMetadata(filePath: string, libraryData: Record<string, LibraryMetadata[]>): Promise<void> {
    if (!filePath.endsWith(".lib")) return;

    const version = await getLibraryVersion(filePath);

    if (version) {
        const libraryName = path.basename(filePath);

        if (!libraryData[libraryName]) {
            libraryData[libraryName] = [];
        }

        libraryData[libraryName].push({ version, filePath });
    }
}

async function scanDirectory(directoryPath: string, libraryData: Record<string, LibraryMetadata[]>): Promise<void> {
    const files = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(directoryPath, file.name);
        if (file.isDirectory()) {
            await scanDirectory(fullPath, libraryData);
        } else {
            await extractLibraryMetadata(fullPath, libraryData);
        }
    }
}

async function synchronizeLibraryRegistry(
    registryPath: string, 
    unstructuredLibraryPath: string
): Promise<boolean> {

    let changed = false;

    const structuredLibraries: Record<string, LibraryMetadata[]> = {};
    const unstructuredLibraries: Record<string, LibraryMetadata[]> = {};

    await scanDirectory(registryPath, structuredLibraries);
    await scanDirectory(unstructuredLibraryPath, unstructuredLibraries);

    for (const [libraryName, unstructuredVersions] of Object.entries(unstructuredLibraries)) {
        const targetLibraryPath = path.join(registryPath, libraryName);

        if (structuredLibraries[libraryName]) {
            const existingVersions = new Set(structuredLibraries[libraryName].map(lib => lib.version));

            for (const { version, filePath } of unstructuredVersions) {
                if (!existingVersions.has(version)) {
                    const versionDirectory = path.join(targetLibraryPath, version);
                    fs.mkdirSync(versionDirectory, { recursive: true });
                    fs.copyFileSync(filePath, path.join(versionDirectory, libraryName));
                    changed = true;
                } 
            }
        } else {
            for (const { version, filePath } of unstructuredVersions) {
                const versionDirectory = path.join(targetLibraryPath, version);
                fs.mkdirSync(versionDirectory, { recursive: true });
                fs.copyFileSync(filePath, path.join(versionDirectory, libraryName));
                changed = true;
            }
        }
    }

    return changed;
}

export {
    synchronizeLibraryRegistry
}
