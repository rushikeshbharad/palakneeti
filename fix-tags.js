const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

/**
 * This script iterates through all article files and replaces tag values
 * (e.g., TAGS["Art Education"]) with their corresponding keys (e.g., TAGS["art-education"]).
 * This ensures consistency in how tags are referenced across the project.
 */
async function fixArticleTags() {
  const projectRoot = __dirname;
  const articlesDir = path.join(projectRoot, "blogs", "constants", "articles");
  const tagsPath = path.join(projectRoot, "blogs", "constants", "tags.js");

  try {
    // 1. Load TAGS and create a reverse map (value -> key)
    console.log("Loading tags...");
    const tagsFileContent = fs.readFileSync(tagsPath, "utf-8");
    const tagsObjectString = tagsFileContent.substring(
      tagsFileContent.indexOf("{"),
      tagsFileContent.lastIndexOf("}") + 1
    );
    const TAGS = new Function(`return ${tagsObjectString}`)();

    const valueToKeyMap = Object.entries(TAGS).reduce((acc, [key, value]) => {
      acc[value] = key;
      return acc;
    }, {});
    console.log(`Loaded ${Object.keys(valueToKeyMap).length} tags.`);

    // 2. Get all article files
    const articleFiles = fs
      .readdirSync(articlesDir)
      .filter((file) => file.endsWith(".js"));

    if (articleFiles.length === 0) {
      console.log("No articles found to process.");
      return;
    }

    console.log(`Found ${articleFiles.length} articles. Starting update...`);
    let filesChanged = 0;

    // 3. Process each article file
    for (const file of articleFiles) {
      const filePath = path.join(articlesDir, file);
      let fileContent = fs.readFileSync(filePath, "utf-8");
      let hasChanged = false;

      const updatedContent = fileContent.replace(
        /TAGS\["([^"]+)"\]/g,
        (match, tagValue) => {
          const tagKey = valueToKeyMap[tagValue];
          if (tagKey && tagKey !== tagValue) {
            hasChanged = true;
            return `TAGS["${tagKey}"]`;
          }
          // If key is not found or is already correct, return original
          if (!tagKey) {
            console.warn(`  - WARNING: No key found for value "${tagValue}" in ${file}`);
          }
          return match;
        }
      );

      if (hasChanged) {
        const formattedContent = await prettier.format(updatedContent, {
          parser: "babel",
          ...(await prettier.resolveConfig(projectRoot)),
        });
        fs.writeFileSync(filePath, formattedContent);
        console.log(`  - Updated: ${file}`);
        filesChanged++;
      }
    }

    console.log(`\n✅ Update complete. ${filesChanged} file(s) were modified.`);
  } catch (error) {
    console.error("❌ An error occurred:", error);
  }
}

fixArticleTags();
