import axios from "axios";

async function checkCollaborators(username: string, link: string, token: string): Promise<boolean> {
    
    let [_, owner, repo] = new URL(link).pathname.split('/');

    if(repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
    }

    try {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/collaborators/${username}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return response.status === 204;
    } catch (error) {
        return false;
    }
}

export default checkCollaborators;
