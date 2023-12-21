# Semantic Release learning

This is my attempt to learn with a hands on project how to use the semantic-release package with expo and EAS.

## Goals

Ideally, I would like to follow a [trunk based development](https://trunkbaseddevelopment.com/) process to help enable CI/CD. My understanding on trunk based development is that it is incredibly easy to have difficulties with it at scale without _solid_ tooling to automate a lot of the process. To that end, this project is an attempt to explore and understand the building blocks that would make up this tooling and use it in a project that would mimic our ideal workflow. I also really wanted an automated CHANGELOG so I can easily pull patch notes from without either asking developers for what changed, consult the sprint board, or manually read commits.

The challenges with having a single trunk for mobile development is with release cadence. Traditionally, a release involves creating a binary has to be created and pushed to a whole separate entity for approval. This creates a hinderance to continuous delivery that's completely out of hands. However, in recent years we've seen the rise of [OTA (Over The Air) updates](https://pagepro.co/blog/react-native-over-the-air-updates/) - a form of release that would allow developers to serve updates on demand. However, not all changes are _compatible_ with an OTA release, so there is still a need for building a binary and waiting for approval on the app store.

On top of that, with react native (and other similar libraries), we can build code for both android and ios with one project. This will create scenarios where you're maintaining more than one version of the project out in production.

Despite this, it should still be possible to have trunk based development. This repo is an exploration into that as well as my playground into learning the various automation tools that will support this.


## The Components

* [Expo](https://expo.dev/) is our development framework of choice for developing the app.
* [EAS](https://expo.dev/eas), produced by Expo, will handle the actual building of the app, submittal to the respective app stores, and handling [OTA (Over The Air) updates](https://pagepro.co/blog/react-native-over-the-air-updates/) to existing app versions in production.
* [Semantic-Release](https://github.com/semantic-release/semantic-release) Will orchestrate many of the busywork related to trunk based development.
* [Github actions](https://docs.github.com/en/actions) will be the environment our automated workflows will run on.

## The Workflow

### Versioning

I'm going to use [semver](https://semver.org/) to denote releases. As a quick refresher, releases are denoted with three numbers in the format `{MAJOR}.{MINOR}.{PATCH}` where breaking changes increment the `{MAJOR}` number and reset the following numbers to 0, new features increment the `{MINOR}` number and reset the `{PATCH}` to 0, and bugfixes increment the `{PATCH}` number.

### Committing Changes

Code changes should take the form of commits on a short lived branch cut from the `main` branch that are then reviewed in a Pull Request (PR) back into the `main` branch. Rarely, if ever, should developers need to PR into other branches as that can cause a host of concerns. As individual commit style may vary between developers and their own branches, squashing before merging the PR is required. Individual PRs should never be completed if they would leave the `main` branch in an unreleasable state.

### Branches and Channels Ambiguity 

It should be noted that `branch` is ambiguous as both git and EAS use the term. Conceptually, they are the same - a snapshot of a version of code. Just like a git branch can receive updates, an EAS branch can receive updates too. The default behavior with EAS when creating an EAS `branch` is that it receives the name of the current git `branch`. This is perfectly fine and know going forward in the article, when `branch` is mentioned, it typically refers to both a git and EAS `branch`. Note that not every git `branch` needs a corresponding EAS `branch`, but if a branch is being referenced here, there will be an EAS `branch`.

EAS also has a concept of a `channel` - a touch point attached to app releases that facilitate pushing updates to a linked EAS branch. Say a particular app build is built with an EAS `production` channel and is linked to the `1.x` branch. Pushes to the `1.x` branch should push an OTA update to these particular builds, but not other builds linked to a different `channel`. It's also possible to switch a `branch` linked to a `channel`. In the above example, linking branch `2.x` to the `production` channel now updates all builds linked to that channel to use the codebase in the `2.x` branch.

You can read about EAS `channel`s and `branch`es and possible deployment patterns [here](https://docs.expo.dev/eas-update/deployment-patterns/). The deployment pattern we'll be using in this example project is the [branch promotion flow](https://docs.expo.dev/eas-update/deployment-patterns/#branch-promotion-flow). This flow provides powerful guardrails against accidentally pushing non OTA'ble code via an OTA by giving each app it's own channel. It also requires the most bookkeeping, something that is perfect for automation.

### Release Cadence

Since we aim for CI/CD, we'll want to OTA changes when applicable. The only changes that can't be OTA'd are changes to the NATIVE layer of the application. In react native land, that's typically any changes that have some special ios / android installation methods. With Expo, changes can be identified using their [fingerprint library](https://github.com/expo/expo-github-action/tree/main/fingerprint). We should always consider changes to the native layer as `{MAJOR}` changes. As such, we'll split the release process into two groups - `{MAJOR}` releases which use the app store submission process and `{MINOR}`/`{PATCH}` releases which use OTA.

#### Release Process

In both of the following processes, code updates should be _cherry-picked_ from the `main` branch into. Committing directly onto an other branch requires a process to merge these changes back into the `main` branch; forgetting to do so would introduce a regression.

##### `{MAJOR}` Releases

When preparing for a `{MAJOR}` release, a dedicated release branch (format `{MAJOR}.x.x`) should be cut for it from the trunk. These branches are kept around for `{MINOR}`/`{PATCH}` releases (more on that in the next section). These branches are deleted when that `{MAJOR}` release is no longer supported - typically when a new `{MAJOR}` release is in production. Note that with both ios and android app versions, you may have up to two release branches alive. You can create multiple binary artifacts to submit to the respective app stores from a given release branch as release _candidates_. This should stop once a candidate has been approved however. 

##### `{MINOR}`/`{PATCH}` Releases

When publishing updates to a version that exists in production, the developer should cherry-pick these changes into the respective `{MAJOR}.x.x` branch. Then, via EAS, an OTA build should be kicked off that publishes these changes to the app in the wild. This process is the same irrespective of whether the update is a `{MINOR}` or `{PATCH}` release.

## CHANGELOG Upkeep

When a developer makes a change (typically through a PR), that PR should be tagged in some way to indicate what type of change it is, whether it's breaking, and a short description of the change. This will fuel the CHANGELOG. Having developers commit using a standardized format (such as [angular's commit message format](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)) helps automation brings these into the CHANGELOG.

## Automation Tasks

### ON PR Upsert

- [ ] Run tests (if any) and flag if success or failure
- [ ] Identify if the PR contains any NATIVE changes and flag as such

### On PR Completion

- [ ] Delete the branch
- [ ] Commit changes to CHANGELOG under Unpublished

### Create `{MAJOR}` Release Candidate (Manually Triggered)

- If `{MAJOR}.x.x` branch does not exist
	- [ ] Bump `package.json` version and `app.config.js` version as appropriate for semver
	- [ ] Set `eas.json` production channel to `{MAJOR}.x.x`
	- [ ] Reset `app.config.js` build numbers to 0
	- [ ] Commit changes to CHANGELOG all Unpublished changes to under `{MAJOR}`
	- [ ] Cut branch `{MAJOR}.x.x` from branch `main`
- [ ] Increment `app.config.js` build numbers
- [ ] Create tag `{MAJOR}.0.0-rc-{timestamp}`
- [ ] Kick off EAS build with auto submit flag

### Promote Release Candidate to Release (Manually Triggered)

This exists because I can't identify a way to programmatically identify when a release is accepted

- [ ] Create tag `{Major}.0.0` at last `{MAJOR}.0.0-rc-{timestamp}` tag

### Create `{MINOR}/{PATCH}` Release (Manually Triggered)

- [ ] Prompt from CHANGELOG's unpublished changes what features to include
- [ ] Prompt what version to bring changes to (populated by what release branches exist)
- [ ] Commit changes to CHANGELOG all selected changes to under relevant new version
- [ ] Run EAS update on the selected `{MAJOR}.x.x` branch
- [ ] Cherry-pick commits (and changelog commit) to selected `{MAJOR}.x.x` branch
- [ ] Create tag as appropriate
