import { printGreeting } from "./services/helpers/greeting";
import { logger } from "./services/logger.service";
import { loadSettings } from "./services/settings/settings.service";

const main = async () => {
  try {
    printGreeting();
    const settings = loadSettings();
    console.log({ settings });
    logger.info("Привет!");
  } catch (error) {
    logger.error(error);
  }
};

main();
