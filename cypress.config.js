const { defineConfig } = require("cypress")
const fs = require("fs")
const path = require("path")
const http = require("http")
const https = require("https")
const { JSDOM } = require("jsdom")
const prettier = require("prettier")

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

          // Check if the file already exists. If so, skip it.
          // TODO: uncomment
        //   if (fs.existsSync(filePath)) {
        //     console.log(`SKIPPED: File already exists at ${filePath}`);
        //     return { skipped: true, path: filePath };
        //   }

          // Separate the HTML content to handle it as a special case
          const { content, ...restOfData } = articleData

          // Stringify the non-HTML parts of the data
          const restOfDataString = JSON.stringify(restOfData, null, 2)
            // We'll insert this inside the final object, so remove the outer braces
            .slice(1, -1)
            .trim()

          // Manually construct the file content, using template literals for the HTML
          // This preserves all newlines and indentation from Prettier
          const fileContent = `const articleData = {
  content: {
    marathi: \`${content.marathi.replace(/`/g, "\\`")}\`,
    english: \`${content.english.replace(/`/g, "\\`")}\`,
  },
  ${restOfDataString}
};

export default articleData;
`

          // Format the entire JS file for consistency
          const finalFormattedContent = await prettier.format(fileContent, {
            parser: "babel",
          })
          fs.writeFileSync(filePath, finalFormattedContent);
          return { skipped: false, path: filePath };
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

            // Choose the correct module (http or https) based on the URL protocol
            const protocol = url.startsWith("https") ? https : http;

            protocol
              .get(url, options, response => {
                response.pipe(file)
                file.on("finish", () => {
                  file.close()
                  // Return the full jsDelivr URL for the downloaded file
                  const cdnPath = path.join(folder, fileName).replace(/\\/g, "/");
                  resolve(`https://cdn.jsdelivr.net/gh/${GITHUB_REPO}/${cdnPath}`);
                })
              })
              .on("error", (err) => {
                fs.unlink(filePath, () => reject(err))
              })
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
      })
    },
  },
})
