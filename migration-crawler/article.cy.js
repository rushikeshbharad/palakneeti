describe.skip('Article Migration Crawler', () => {
  // Use a function() test body to have access to `this` for aliases
  for (let i = 1; i <= 101; i += 1) {
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
                  const finalSlug = `${this.date}_${this.slug}`;

                  // --- 4. Assemble and save the data ---
                  // First, try to get existing article data to avoid overwriting.
                  cy.task('getArticleData', finalSlug).then(existingData => {
                    const articleData = existingData || {
                        content: { marathi: ``, english: `` },
                        title: { marathi: "", english: "" },
                        short: { marathi: "", english: "" },
                        authors: [],
                        translators: [],
                        verbalizers: [],
                        conceptualists: [],
                        tags: [],
                        image: null,
                        verified: { marathi: false, english: false }
                    };

                    // Update the data with newly crawled information
                    articleData.image = this.imageUrl;

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

                    cy.task('saveArticle', { slug: finalSlug, articleData })
                      .then(result => cy.log(`SUCCESS: Saved article to ${result.path}`));
                  });
                });
            });
            });
        });
        });
    });
  }
});

describe.skip('Tag Migration Crawler 1', () => {
  const allTags = {};
  const articlesWithTags = [];

  // Phase 1: Collect all tags and article tag mappings from all pages
  for (let i = 1; i <= 101; i += 1) {
    it(`Phase 1: Collect tags from page ${i}`, () => {
      cy.visit(`/all-about-palakneeti-parivar/masik-blog/page/${i}/`);

      cy.get('body').then($body => {
        // If the main content area doesn't exist, the page is likely a 404 or empty.
        if ($body.find('.bdpp-post-grid-content').length === 0) {
          cy.log(`No articles found on page ${i}, skipping.`);
          return;
        }

        const pageArticles = [];
        cy.get('.bdpp-post-grid-content').each(($tile) => {
          const articleInfo = {};
          cy.wrap($tile).find('h2 a').invoke('attr', 'href').then(url => {
            articleInfo.url = url;
          });
          cy.wrap($tile).find('.bdpp-post-meta-up').invoke('text').then(dateText => {
            articleInfo.dateText = dateText.trim();
          }).then(() => {
            pageArticles.push(articleInfo);
          });
        }).then(() => {
          // Now that we have all article info, we can visit each one without breaking the .each() loop.
          cy.wrap(pageArticles).each(article => {
            const slug = decodeURI(article.url.split('/').filter(Boolean).pop());
            const parsedDate = new Date(article.dateText);
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const date = `${year}_${month}_${day}`;
            const finalSlug = `${date}_${slug}`;

            // Visit each article to get its tags
            cy.visit(article.url);
            cy.get('body').then($articleBody => {
              if ($articleBody.find('.cat-links a').length > 0) {
                const articleTagKeys = [];
                cy.get('.cat-links a').each($tagLink => {
                  const tagHref = $tagLink.attr('href');
                  const tagKey = decodeURI(tagHref.replace(/\/$/, '').split('/').pop());
                  const tagValue = $tagLink.text().trim();

                  if (tagKey && tagValue) {
                    allTags[tagKey] = tagValue;
                    articleTagKeys.push(tagKey);
                  }
                }).then(() => {
                  if (articleTagKeys.length > 0) {
                    articlesWithTags.push({ slug: finalSlug, tags: articleTagKeys });
                  }
                });
              }
            });
          });
        });
      });
    });
  }

  // Phase 2: Save all collected data
  it('Phase 2: Save all collected tags and update article files', () => {
    // 1. Save the master tags file
    cy.log('Saving all collected tags...');
    cy.task('saveTagsFile', allTags).then(result => {
      if (result.success) {
        cy.log(`SUCCESS: Saved tags to ${result.path}`);
      } else {
        cy.log(`ERROR: Failed to save tags file: ${result.error}`);
      }
    });

    // 2. Update each article that has tags
    cy.log(`Found ${articlesWithTags.length} articles with tags to update.`);
    articlesWithTags.forEach(article => {
      cy.task('updateArticleTags', { slug: article.slug, tags: article.tags }).then(result => {
        if (result.success) {
          cy.log(`SUCCESS: Updated tags for ${article.slug} at ${result.path}`);
        } else {
          cy.log(`SKIPPED/ERROR updating ${article.slug}: ${result.error}`);
        }
      });
    });
  });
});

describe.skip('Tag Migration Crawler 2', () => {
  let allTags = {};
  const articlesWithTags = [];

  before(() => {
    cy.task('getExistingTags').then(tags => {
      allTags = tags || {};
      cy.log(`Loaded ${Object.keys(allTags).length} existing tags.`);
    });
  });

  // Phase 1: Collect all tags and article tag mappings from all pages
  for (let i = 1; i <= 101; i += 1) {
    it(`Phase 1: Collect tags from page ${i}`, () => {
      cy.visit(`/all-about-palakneeti-parivar/masik-blog/page/${i}/`);

      cy.get('body').then($body => {
        // If the main content area doesn't exist, the page is likely a 404 or empty.
        if ($body.find('.bdpp-post-grid-content').length === 0) {
          cy.log(`No articles found on page ${i}, skipping.`);
          return;
        }

        const pageArticles = [];
        cy.get('.bdpp-post-grid-content').each(($tile) => {
          const articleInfo = {};
          cy.wrap($tile).find('h2 a').invoke('attr', 'href').then(url => {
            articleInfo.url = url;
          });
          cy.wrap($tile).find('.bdpp-post-meta-up').invoke('text').then(dateText => {
            articleInfo.dateText = dateText.trim();
          }).then(() => {
            pageArticles.push(articleInfo);
          });
        }).then(() => {
          // Now that we have all article info, we can visit each one without breaking the .each() loop.
          cy.wrap(pageArticles).each(article => {
            const slug = decodeURI(article.url.split('/').filter(Boolean).pop());
            const parsedDate = new Date(article.dateText);
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            const date = `${year}_${month}_${day}`;
            const finalSlug = `${date}_${slug}`;

            // Visit each article to get its tags
            cy.visit(article.url);
            cy.get('body').then($articleBody => {
              if ($articleBody.find('.tags-links a').length > 0) {
                const articleTagKeys = [];
                cy.get('.tags-links a').each($tagLink => {
                  const tagHref = $tagLink.attr('href');
                  const tagKey = decodeURI(tagHref.replace(/\/$/, '').split('/').pop());
                  const tagValue = $tagLink.text().trim();

                  if (tagKey && tagValue) {
                    allTags[tagKey] = tagValue;
                    articleTagKeys.push(tagKey);
                  }
                }).then(() => {
                  if (articleTagKeys.length > 0) {
                    articlesWithTags.push({ slug: finalSlug, tags: articleTagKeys });
                  }
                });
              }
            });
          });
        });
      });
    });
  }

  // Phase 2: Save all collected data
  it('Phase 2: Save all collected tags and update article files', () => {
    // 1. Save the master tags file
    cy.log('Saving all collected tags...');
    cy.task('saveTagsFile', allTags).then(result => {
      if (result.success) {
        cy.log(`SUCCESS: Saved tags to ${result.path}`);
      } else {
        cy.log(`ERROR: Failed to save tags file: ${result.error}`);
      }
    });

    // 2. Update each article that has tags
    cy.log(`Found ${articlesWithTags.length} articles with tags to update.`);
    articlesWithTags.forEach(article => {
      cy.log("article => ", article)
      cy.task('updateArticleTags', { slug: article.slug, tags: article.tags }).then(result => {
        if (result.success) {
          cy.log(`SUCCESS: Updated tags for ${article.slug} at ${result.path}`);
        } else {
          cy.log(`SKIPPED/ERROR updating ${article.slug}: ${result.error}`);
        }
      });
    });
  });
});
