const git = require('git-rev-sync');
const Octokit = require('@octokit/rest');

/**
 * Returns section
 * @param name
 */
function getSection(name) {
  switch (name) {
    case 'bugfix':
      return '🐛 Bugfix';
    case 'feature':
      return '🚀 Feature';
    default:
      return name;
  }
}

// if we need to access branch name in the future, we can grab it with the following:
// const branchName = git.branch();
const commitMsg = git.message();

console.log('message:', commitMsg);

// Get every change of the new version
const changes = commitMsg.split('\\n');
changes.splice(0, 2);

console.log('changes:', changes);

const data = {};
changes.forEach((change) => {
  const split = change.split('[').pop().split(']');
  const key = split[0];
  if (data[key] === undefined) {
    data[key] = [];
  }
  data[key].push(split[1]);
});

let body = '';

Object.keys(data).forEach((key) => {
  body += `<h1>${getSection(key)}</h1><ul>`;
  data[key].forEach((value) => {
    const split = value.split('(');
    const ticket = split[1].slice(0, -1);
    console.log(split);
    body += `<li><a href="https://jira.netrtl.com/browse/${ticket}">${ticket} </a>${split[0]}</li>`;
  });
  body += '</ul>';
});

console.log('body: ', body);

const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
const owner = 'therweg';
const repo = 'release-automation';

octokit.repos.getLatestRelease({
  owner,
  repo,
}).then(response => {
  console.log('LatestVersionResponse:', response.data);
  const currentVersion = response.data.name.split('.');

  console.log('currentVersion:', currentVersion);

  let newVersion = '';
  if (data.feature !== undefined) {
    newVersion = `${currentVersion[0]}.${parseInt(currentVersion[1], 10) + 1}.${currentVersion[2]}`;
  } else {
    newVersion = `${currentVersion[0]}.${currentVersion[1]}.${parseInt(currentVersion[2], 10) + 1}`;
  }

  octokit.repos.createRelease({
    owner,
    repo,
    tag_name: `v${newVersion}`,
    target_commitish: git.long(),
    name: newVersion,
    body,
    draft: false,
    prerelease: false,
  });
}).catch(error => {
  console.log("octokitError", error);
});
