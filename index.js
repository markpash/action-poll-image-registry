const core = require('@actions/core');
const drc = require('docker-registry-client');

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function run() {
  try {
    const consecutiveErrors = parseInt(core.getInput('consecutive-errors'));
    const pollingRate = parseInt(core.getInput('polling-rate-seconds'));
    const images = core.getMultilineInput('images');

    for (const img in images) {
      const image = images[img];

      core.info(`waiting for image manifest to be available for ${image}`);

      const parsed = drc.parseRepoAndRef(image);
      const client = drc.createClientV2({ repo: parsed });
      const opts = { ref: parsed.tag || parsed.digest, acceptManifestLists: true, maxSchemaVersion: 2 };

      let errors = 0;
      let foundManifestStr = "";

      // Keep trying as long as we haven't hit the error limit or found
      // the manifest.
      while (foundManifestStr === "") {
        let done = false;
        client.getManifest(opts, function (err, manifest, res, manifestStr) {
          client.close();

          if (err) {
            if (err?.body?.code === 'undefined' || err?.body?.code !== "NotFoundError") {
              errors += 1;
              core.warning(err);
            } else {
              // Reset errors counter to 0. We only care about the
              // consecutive errors.
              errors = 0;
            }
          } else {
            foundManifestStr = manifestStr;
            core.info(`image manifest found for ${image} at: ${foundManifestStr}`);
          }

          done = true;
        });

        // The docker registry library is non-blocking, dirty
        // workaround.
        while (!done) await sleep(1000);

        // If we've hit the limit on consecutive errors, something isn't
        // right. Bail.
        if (errors == consecutiveErrors) throw new Error(`failed to contact registry after ${consecutiveErrors} consecutive retries`);

        // Sleep for 45s if we haven't found the manifest yet.
        if (foundManifestStr === "") await sleep(pollingRate * 1000);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
