const { defineConfig } = require("cypress")
const fs = require("fs")
const path = require("path")
const { pipeline } = require("stream/promises");
const http = require("http")
const https = require("https")
const { JSDOM } = require("jsdom")
const prettier = require("prettier")
const recast = require("recast")

module.exports = defineConfig({
  e2e: {
    baseUrl: "https://palakneeti.in",
    specPattern: "migration-crawler/**/*.cy.js",
    supportFile: false,
    // Increase timeout for longer operations like file downloads
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // Define your GitHub repo details for jsDelivr
      const GITHUB_REPO = "rushikeshbharad/palakneeti";

      on("task", {
        async saveArticle({ slug, articleData }) {
          const dir = path.join(config.projectRoot, "blogs", "constants", "articles")
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          const filePath = path.join(dir, `${slug}.js`)
          // Separate the HTML content to handle it as a special case
          const { content, ...restOfData } = articleData
          const restOfDataString = JSON.stringify(restOfData, null, 2)
            .slice(1, -1)
            .trim()

          const newArticleDataObjectString = `{
            content: {
              marathi: \`${content.marathi.replace(/`/g, "\\`")}\`,
              english: \`${content.english.replace(/`/g, "\\`")}\`,
            },
            ${restOfDataString}
          }`;

          let finalFileContent;

          if (fs.existsSync(filePath)) {
            // File exists: Read, replace, and write back to preserve imports.
            const existingContent = fs.readFileSync(filePath, 'utf-8');
            const articleDataRegex = /const\s+articleData\s*=\s*({[\s\S]*?});/;
            if (articleDataRegex.test(existingContent)) {
              finalFileContent = existingContent.replace(
                articleDataRegex,
                `const articleData = ${newArticleDataObjectString};`
              );
            } else {
              // Fallback if regex fails, though it shouldn't.
              console.error(`Could not find articleData object in ${slug}.js to replace.`);
              return { error: `Failed to update ${slug}.js` };
            }
          } else {
            // File doesn't exist: Create it from scratch.
            finalFileContent = `const articleData = ${newArticleDataObjectString};

export default articleData;
`;
          }

          const finalFormattedContent = await prettier.format(finalFileContent, {
            parser: "babel",
            ...(await prettier.resolveConfig(config.projectRoot)),
          });

          fs.writeFileSync(filePath, finalFormattedContent);
          return { path: filePath };
        },
        downloadFile({ url, folder, fileName }) {
          return new Promise((resolve, reject) => {
            if (!url || !url.startsWith("http")) {
                return resolve('');
            }

            if (url.split('http').length > 2) {
                url = `http${url.split('http').pop()}`
            }

            // If the URL is external (not on palakneeti.in), resolve with the original URL.
            if (!url.startsWith("http://palakneeti") && !url.startsWith("https://palakneeti")) {
              console.log(`SKIPPED download for external image: ${url}`);
              return resolve(url);
            }

            const fullFolderPath = path.join(config.projectRoot, folder)
            if (!fs.existsSync(fullFolderPath)) {
              fs.mkdirSync(fullFolderPath, { recursive: true })
            }
            const filePath = path.join(fullFolderPath, fileName)
            const file = fs.createWriteStream(filePath)

            // Add a User-Agent header to mimic a browser request, which can prevent "socket hang up" errors.
            const options = {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
              }
            };

            // Use native fetch to handle downloads and redirects in the Node.js environment.
            fetch(url, { ...options, redirect: 'follow' })
              .then(res => {
                if (!res.ok) {
                  throw new Error(`Failed to download file: ${res.status} ${res.statusText}`);
                }
                // res.body is a Web ReadableStream. We use stream.pipeline to correctly pipe it to a Node.js WritableStream.
                const dest = fs.createWriteStream(filePath);
                // Use pipeline to handle the stream and automatically close it on completion or error.
                return pipeline(res.body, dest).then(() => {
                  const cdnPath = path.join(folder, fileName).replace(/\\/g, "/");
                  resolve(`https://cdn.jsdelivr.net/gh/${GITHUB_REPO}/${cdnPath}`);
                });
              })
              .catch(() => {
                fs.unlink(filePath, () => {});
              });
          })
        },
        async processHtml({ htmlString, slug, title }) {
          const dom = new JSDOM(htmlString)
          const document = dom.window.document

          // 1. Remove share buttons and entry meta elements
          const shareButtons = document.querySelector(
            ".addtoany_share_save_container"
          )
          const entryMeta = document.querySelector(".entry-meta")
          if (shareButtons) {
            shareButtons.remove()
          }
          if (entryMeta) {
            entryMeta.remove()
          }

          // 2. Process anchor tags
          const anchors = document.querySelectorAll("a")
          anchors.forEach((a) => {
            a.setAttribute("target", "_blank") // Add target="_blank"
            let href = decodeURI(a.getAttribute("href") || "")
            if (href && (href.startsWith("https://palakneeti.in") || href.startsWith("http://palakneeti.in"))) {
              // Keep only the relative path
              a.setAttribute("href", decodeURI(new URL(href).pathname))
            }
          })

          // 3. Process image tags (this is a synchronous part of an async process)
          const images = document.querySelectorAll("img")
          const imageDownloads = []

          images.forEach((img, index) => {
            const src = img.getAttribute("src") || ""
            if (!src) return

            if (src.split('http').length > 2) {
                src = `http${src.split('http').pop()}`
            }

            // If the image is from an external domain, leave it as is.
            // We only want to process images hosted on the original palakneeti.in site.
            if (!src.startsWith("http://palakneeti") && !src.startsWith("https://palakneeti")) {
              if (!src.startsWith("http")) {
                img.remove();
              }
              return; // Skip this image
            }

            const originalFileName = decodeURI(src).split("/").pop().split("?")[0]
            const newFileName = `${slug}-${index}-${originalFileName}`
            const localFolderPath = "assets/article-images";
            const cdnPath = `${localFolderPath}/${newFileName}`;

            // Add to list of downloads to be performed by Cypress
            imageDownloads.push({
              url: src,
              folder: localFolderPath,
              fileName: newFileName,
            })

            // Update the src in the HTML
            img.setAttribute("src", `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}/${cdnPath}`);
            img.removeAttribute("srcset")
            // Add alt = title if alt is empty
            if (!img.getAttribute("alt")) {
              img.setAttribute("alt", title);
            }
          })

          // Remove attributes with no value assigned
          document.querySelectorAll('img').forEach((img) => {
            Object.values(img.attributes).forEach(attr => {
                if(!attr.value) {
                    img.removeAttribute(attr.name)
                }
            })
          });

          const rawCleanedHtml = document.body.innerHTML

          // Format the HTML string using Prettier for readability
          const formattedHtml = await prettier.format(rawCleanedHtml, {
            parser: "html",
          })

          return {
            cleanedHtml: formattedHtml,
            imageDownloads,
          }
        },
        getArticleData(slug) {
          const articlePath = path.join(config.projectRoot, "blogs", "constants", "articles", `${slug}.js`);
          if (!fs.existsSync(articlePath)) {
            return null; // File doesn't exist, so no data to return
          }
          try {
            const fileContent = fs.readFileSync(articlePath, "utf-8");
            // This is a safe way to extract the object without using eval()
            // It finds the start of the object `{` and its corresponding end `}`
            const startIndex = fileContent.indexOf('{');
            const endIndex = fileContent.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) {
              return null;
            }
            const objectString = fileContent.substring(startIndex, endIndex + 1);
            // The string is essentially a JSON object, but keys are not quoted. We can use a trick.
            const articleData = new Function(`return ${objectString}`)();
            return articleData;
          } catch (error) {
            console.error(`Error reading or parsing ${articlePath}:`, error);
            return null;
          }
        },
        getExistingTags() {
          const tagsPath = path.join(config.projectRoot, "blogs", "constants", "tags.js");
          if (!fs.existsSync(tagsPath)) {
            console.log('No existing tags.js file found. Starting fresh.');
            return {}; // File doesn't exist, return empty object
          }
          try {
            const fileContent = fs.readFileSync(tagsPath, "utf-8");
            // Safely extract the object by finding the first '{' and last '}'
            const startIndex = fileContent.indexOf('{');
            const endIndex = fileContent.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) {
              return {};
            }
            const objectString = fileContent.substring(startIndex, endIndex + 1);
            return new Function(`return ${objectString}`)();
          } catch (error) {
            console.error(`Error reading or parsing ${tagsPath}:`, error);
            return {}; // Return empty object on error
          }
        },
        async saveTagsFile(tags) {
          const tagsPath = path.join(config.projectRoot, "blogs", "constants", "tags.js");
          try {
            // Sort tags by key for consistent order
            const sortedTags = Object.fromEntries(Object.entries(tags).sort());

            const fileContent = `// This file is auto-generated by the Cypress migration crawler. Do not edit manually.

const TAGS = ${JSON.stringify(sortedTags, null, 2)};

export default TAGS;
`;
            const formattedContent = await prettier.format(fileContent, {
              parser: "babel",
            });

            fs.writeFileSync(tagsPath, formattedContent);
            return { success: true, path: tagsPath };
          } catch (error) {
            return { success: false, error: error.message };
          }
        },
        async updateArticleTags({ slug, tags: newTags }) {
          const articlePath = path.join(config.projectRoot, "blogs", "constants", "articles", `${slug}.js`);
          if (!fs.existsSync(articlePath)) {
            return { success: false, error: "Article file not found." };
          }

          let fileContent = fs.readFileSync(articlePath, "utf-8");

          const ast = recast.parse(fileContent, { parser: require("recast/parsers/babel") });
          const b = recast.types.builders;

          let articleDataNode;
          recast.visit(ast, {
            visitVariableDeclarator(path) {
              if (path.node.id.name === 'articleData') {
                articleDataNode = path.node.init;
                return false; // Stop traversal
              }
              this.traverse(path);
            }
          });

          if (!articleDataNode || articleDataNode.type !== 'ObjectExpression') {
            return { success: false, error: "Could not find articleData object in file." };
          }

          const tagsProperty = articleDataNode.properties.find(
            p => p.key.name === 'tags'
          );

          const existingTagKeys = new Set();
          if (tagsProperty && tagsProperty.value.type === 'ArrayExpression') {
            tagsProperty.value.elements.forEach(el => {
              if (el.type === 'MemberExpression' && el.object.name === 'TAGS' && el.property.type === 'StringLiteral') {
                existingTagKeys.add(el.property.value);
              }
            });
          }

          newTags.forEach(tag => existingTagKeys.add(tag));
          const combinedTags = Array.from(existingTagKeys).sort();

          const newTagsArray = b.arrayExpression(
            combinedTags.map(tagKey =>
              b.memberExpression(b.identifier('TAGS'), b.stringLiteral(tagKey), true)
            )
          );

          if (tagsProperty) {
            tagsProperty.value = newTagsArray;
          } else {
            articleDataNode.properties.push(b.property('init', b.identifier('tags'), newTagsArray));
          }

          // Ensure the import exists
          const hasTagsImport = ast.program.body.some(node => node.type === 'ImportDeclaration' && node.source.value === '../tags.js');
          if (!hasTagsImport) {
            ast.program.body.unshift(b.importDeclaration([b.importDefaultSpecifier(b.identifier('TAGS'))], b.literal('../tags.js')));
          }

          const newFileContent = recast.print(ast).code;

          // If no tags to add/update, we can skip writing the file.
          if (!combinedTags || combinedTags.length === 0) {
            return { success: true, path: articlePath, message: "No tags to update." };
          }

          const formattedContent = await prettier.format(newFileContent, {
            parser: "babel",
            // Resolve config to ensure it uses your project's prettier settings
            ...(await prettier.resolveConfig(config.projectRoot)),
          });

          fs.writeFileSync(articlePath, formattedContent);

          return { success: true, path: articlePath };
        },
      })
    },
  },
})
