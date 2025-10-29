const { defineConfig } = require("cypress")
const fs = require("fs")
const path = require("path")
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
      on("task", {
        async saveArticle({ slug, articleData }) {
          const dir = path.join(config.projectRoot, "blogs", "constants", "articles")
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
          }
          const filePath = path.join(dir, `${slug}.js`)

          // Check if the file already exists. If so, skip it.
          if (fs.existsSync(filePath)) {
            console.log(`SKIPPED: File already exists at ${filePath}`);
            return { skipped: true, path: filePath };
          }

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
            const fullFolderPath = path.join(config.projectRoot, folder)
            if (!fs.existsSync(fullFolderPath)) {
              fs.mkdirSync(fullFolderPath, { recursive: true })
            }
            const filePath = path.join(fullFolderPath, fileName)
            const file = fs.createWriteStream(filePath)

            https
              .get(url, (response) => {
                response.pipe(file)
                file.on("finish", () => {
                  file.close()
                  // Return the relative path for use in the test
                  resolve(path.join(folder, fileName).replace(/\\/g, "/"))
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
            if (href && href.startsWith("https://palakneeti.in")) {
              // Keep only the relative path
              a.setAttribute("href", new URL(href).pathname)
            }
          })

          // 3. Process image tags (this is a synchronous part of an async process)
          const images = document.querySelectorAll("img")
          const imageDownloads = []

          images.forEach((img, index) => {
            const src = img.getAttribute("src") || ""
            if (!src) return

            const originalFileName = decodeURI(src).split("/").pop().split("?")[0]
            const extension = originalFileName.split(".").pop() || "jpg"
            const newFileName = `${slug}-${index}-${originalFileName}`
            const newImagePath = `assets/article-images/${newFileName}`

            // Add to list of downloads to be performed by Cypress
            imageDownloads.push({
              url: src,
              folder: "assets/article-images",
              fileName: newFileName,
            })

            // Update the src in the HTML
            img.setAttribute("src", `/${newImagePath}`)
            img.removeAttribute("srcset")
            // Add alt = title if alt is empty
            if (!img.getAttribute("alt")) {
              img.setAttribute("alt", title);
            }
          })

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
