import path from "node:path";

export const STORAGE_STATE_PATH = path.join(__dirname, ".auth/perf-user.json");
export const RESULTS_DIR = path.join(__dirname, "results");
export const USERS_CSV_PATH = path.join(__dirname, "../../performance/k6/data/users.csv");
export const SAMPLE_POST_IDS_PATH = path.join(__dirname, "../../performance/k6/data/sample-post-ids.json");
