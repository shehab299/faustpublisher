import {
    updateRegistry,
    publishPackage,
    downloadPackage,
    gitCmd,
    getRegistryDefaultBranch,
    publishRegistry
} from './gitUtils.js';

import { compilePackage } from './compilerUtils.js';
import { isPath, mkPath } from '../utils/filesUtils.js';
import { synchronizeLibraryRegistry } from './faustlibraries.js';
import checkCode from './checkImports.js';
import path from 'path';
import { Errors } from '@oclif/core';
import fs from 'fs';
import getRegistryLink from '../utils/getRegistryLink.js';

const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

async function isVersionAvailable(version, registryPath, author, packageName) {
    return !isPath(path.join(registryPath, author, packageName, version));
}

function isValidVersionFormat(version) {
    return SEMVER_REGEX.test(version);
}

function copyPackageToRegistry(mainfilePath, registryPath, owner, packageName, newVersion) {
    const registryPackagePath = path.join(registryPath, owner, packageName, newVersion);
    mkPath(registryPackagePath);
    fs.copyFileSync(mainfilePath, path.join(registryPackagePath, packageName));
}

function extractRepoName(repoUrl) {
    return new URL(repoUrl).pathname.split('/')[2];
}

function validateRepoName(repo) {
    if (!repo.endsWith('.lib')) {
        throw new Errors.CLIError('Invalid Repository Name');
    }
}

async function publishLibraries(faustlibrariesRepo, faustPath) {
    const registryPath = path.join(faustPath, '.reg');
    const downloadsFolder = path.join(faustPath, '.downloads');
    const registryUrl = getRegistryLink();

    const git = gitCmd(registryPath);
    updateRegistry(git, registryPath, registryUrl);
    
    const faustlibrariesPath = downloadPackage(faustlibrariesRepo, 'faustlibraries', downloadsFolder);
    
    if (!await synchronizeLibraryRegistry(registryPath, faustlibrariesPath)) {
        return false;
    }
    
    publishRegistry(git, 'Synchronizing faust registry with faustlibraries', getRegistryDefaultBranch(git));
    return true;
}

async function publish(pkgRepo, author, faustPath) {
    const registryPath = path.join(faustPath, '.reg');
    const downloadsFolder = path.join(faustPath, '.downloads');
    const registryUrl = getRegistryLink();

    const git = gitCmd(registryPath);
    updateRegistry(git, registryPath, registryUrl);
    
    const packageName = extractRepoName(pkgRepo);
    validateRepoName(packageName);

    const pkgFolder = downloadPackage(pkgRepo, packageName, downloadsFolder);
    const { mainfilePath, version } = await compilePackage(pkgFolder, packageName);

    if (!checkCode(mainfilePath)) {
        throw new Errors.CLIError('You are using non-package imports, which is not allowed.');
    }

    if (!isValidVersionFormat(version)) {
        throw new Errors.CLIError('Invalid declared version format. Use Semantic Versioning (semver).');
    }

    if (!await isVersionAvailable(version, registryPath, author, packageName)) {
        throw new Errors.CLIError('The version you are trying to publish already exists.');
    }

    try {
        copyPackageToRegistry(mainfilePath, registryPath, author, packageName, version);
    } catch (err) {
        throw new Errors.CLIError('Unexpected error occurred while copying the package. Please try again.');
    }

    publishPackage(git, version, getRegistryDefaultBranch(git));
}

export { publishLibraries, publish };
