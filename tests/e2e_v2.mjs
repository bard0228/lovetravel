import path from "node:path";
import { runVerification } from "/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/8f4f6185-c5e7-42ba-a35b-f1e27787fb04/scratch/verify-runner.mjs";

const url = process.argv[2] || "http://127.0.0.1:4176/lovetravel/";

runVerification({
  url,
  width: 412,
  height: 915,
  customScript: path.resolve("tests/e2e_v2_script.mjs"),
})
  .then((res) => {
    console.log(`PASS e2e_v2 (${res.viewport}, consoleErrors=0, overflow=0)`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`FAIL e2e_v2: ${err.message}`);
    process.exit(1);
  });
