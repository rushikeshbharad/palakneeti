describe('Article Migration Crawler', () => {
  // Use a function() test body to have access to `this` for aliases
  for (let i = 88; i <= 88; i += 1) {
    it(`Process all articles from the "Masik Blog" page ${i}`, function() {
        cy.log('Visiting the Masik Blog page...');
        cy.visit(`/all-about-palakneeti-parivar/masik-blog/page/${i}/`);

        // --- Phase 1: Collect all article URLs from the page ---
        const articleTiles = [];
        cy.get('.bdpp-post-grid-content').each(($tile) => {
        // Cypress commands are asynchronous, so we extract data and store it.
        // We can't visit inside the .each() loop, so we gather all info first.
        const tileData = {};
        cy.wrap($tile).find('h2 a').invoke('attr', 'href').then(href => {
            tileData.url = href;
        });
        cy.wrap($tile).find('h2 a').invoke('text').then(text => {
            tileData.title = text.trim();
        });
        cy.wrap($tile).find('.bdpp-post-desc').invoke('text').then(text => {
            tileData.short = text.trim();
        });
        cy.wrap($tile).find('.bdpp-post-meta-up').invoke('text').then(dateText => {
            tileData.dateText = dateText.trim();
        });
        // Handle optional image: Use a non-retrying find to prevent timeouts
        cy.wrap($tile).parent().then($parent => {
            const $img = $parent.find('.bdpp-post-img-bg img');
            if ($img.length) {
            tileData.imageUrl = decodeURI($img.attr('src'));
            } else {
            cy.log(`No image found for article: "${tileData.title}"`);
            tileData.imageUrl = null;
            }
        }).then(() => {
            articleTiles.push(tileData);
        });
        }).then(() => {
        // --- Phase 2: Iterate over the collected data and process each article ---
        cy.log(`Found ${articleTiles.length} articles to process.`);

        articleTiles.forEach((tile, index) => {
            cy.log(`--- Processing article ${index + 1} of ${articleTiles.length}: ${tile.title} ---`);

            // 1. Set up aliases for the current article
            const slug = decodeURI(tile.url.split('/').filter(Boolean).pop());
            // Devanagari script unicode range starts at 0x0900 (2304)
            const isMarathi = tile.title.charCodeAt(0) > 2304;
            const parsedDate = new Date(tile.dateText);
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const date = `${year}_${month}_${day}`;

            cy.wrap(tile.title).as('title');
            cy.wrap(isMarathi).as('isMarathi');
            cy.wrap(slug).as('slug');
            cy.wrap(tile.short).as('short');
            cy.wrap(date).as('date');

            // 2. Download the main image for the article
            if (tile.imageUrl) {
                const extension = tile.imageUrl.split('.').pop().split('?')[0];
                const fileName = `${slug}.${extension}`;
                const folder = 'assets/article-images';

                // Let Cypress handle the promise from the task.
                // We can chain .then() for success and use a second argument for failure.
                cy.task('downloadFile', { url: tile.imageUrl, folder, fileName })
                  .then(
                    (filePath) => { // onFulfilled
                      cy.log(`Main image downloaded to: ${filePath}`);
                      return filePath; // Pass the value to the next command in the chain
                    },
                    (err) => { // onRejected
                      cy.log(`⚠️ Main image download failed for ${tile.imageUrl}: ${err.message}`);
                      return ''; // Return an empty string on failure
                    })
                  .as('imageUrl'); // Set the alias with the result (filePath or '')
            } else {
                cy.wrap(null).as('imageUrl'); // Ensure alias is set to null if no image
            }

            // 3. Visit the article page and process its content
            cy.visit(tile.url);
            cy.get('article').invoke('prop', 'outerHTML').then(rawHtml => {
            cy.log('Extracted raw article HTML. Processing...');

            // Call the task to clean the HTML and get a list of images to download
            cy.task('processHtml', { htmlString: rawHtml, slug: this.slug, title: this.title }).then(({ cleanedHtml, imageDownloads }) => {
                cy.log('HTML processed. Downloading embedded images...');

                // Download all images found in the article content
                const downloadPromises = imageDownloads.map(image =>
                cy.task('downloadFile', image)
                );

                // Wrap the native Promise in a cy.wrap() to make Cypress wait for it to resolve
                cy.wrap(Promise.all(downloadPromises)).then(() => {
                cy.log('All embedded images downloaded.');
                cy.log('Assembling final article data...');
                // --- 4. Assemble and save the data ---
                const articleData = {
                    content: { marathi: ``, english: `` },
                    title: { marathi: "", english: "" },
                    short: { marathi: "", english: "" },
                    authors: [],
                    translators: [],
                    verbalizers: [],
                    conceptualists: [],
                    tags: [],
                    image: this.imageUrl,
                    verified: { marathi: false, english: false }
                };

                if (this.isMarathi) {
                    articleData.content.marathi = cleanedHtml;
                    articleData.title.marathi = this.title;
                    articleData.short.marathi = this.short;
                    articleData.verified.marathi = true;
                } else {
                    articleData.content.english = cleanedHtml;
                    articleData.title.english = this.title;
                    articleData.short.english = this.short;
                    articleData.verified.english = true;
                }

                const finalSlug = `${this.date}_${this.slug}`;
                cy.task('saveArticle', { slug: finalSlug, articleData }).then(result => {
                    if (result.skipped) {
                    cy.log(`SKIPPED: Article already exists at ${result.path}`);
                    } else {
                    cy.log(`SUCCESS: Saved article to ${result.path}`);
                    }
                });
                });
            });
            });
        });
        });
    });
  }
});
