import { Args, Command } from "@oclif/core";
import getCreditsPath, { createFaustDir, getFaustPath } from "../utils/creditsPathUtils.js";
import { getToken } from "../utils/checkTokenUtils.js";
import getUser from "../utils/getUserUtils.js";
import checkCollaborators from "../utils/checkCollabs.js";
import { publishLibraries } from "../publisher/publish.js";

class PublishLibraries extends Command {

    static description = "Publish updates from the faustlibraries repository to the Faust Registry\n";

    static examples = [`$ faustpublisher publishLibraries`];

    private static readonly LIBRARIES_REPO_URL = "https://github.com/shehab299/faustlibraries.git";

    async run() {
        try {
            createFaustDir();
            const faustPath = getFaustPath();
            const token = await getToken(getCreditsPath());
            const user = await getUser(token);

            const isCollaborator = await checkCollaborators(user, PublishLibraries.LIBRARIES_REPO_URL, token);
            if (!isCollaborator) {
                this.error("You are not a collaborator of this repository.");
            }

            const published = await publishLibraries(PublishLibraries.LIBRARIES_REPO_URL, faustPath);
            if (!published) {
                this.error("No changes detected: The registry is already up to date.");
            }

            this.log("✅ Registry updated successfully!");
        } catch (error) {
            this.error(`❌ Failed to publish libraries: ${error.message}`);
        }
    }
}

export default PublishLibraries;
