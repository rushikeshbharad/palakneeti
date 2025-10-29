describe('Article Migration Crawler', () => {
  // Use a function() test body to have access to `this` for aliases
  it('should process the first article from the "Masik Blog" page', function() {
    cy.log('Visiting the Masik Blog page...');

    cy.visit('/all-about-palakneeti-parivar/masik-blog/');

    // Target only the first article tile
    cy.get('.bdpp-post-grid-content').first().within(($tile) => {
      // --- 1. Extract data from the tile ---

      // Get title and determine if it's Marathi
      cy.get('h2 a').invoke('text').then(text => {
        const title = text.trim();
        // Devanagari script unicode range starts at 0x0900 (2304)
        const isMarathi = title.charCodeAt(0) > 2304;
        cy.log(`Title: ${title} (isMarathi: ${isMarathi})`);
        cy.wrap(title).as('title');
        cy.wrap(isMarathi).as('isMarathi');
      });

      // Get slug from the link's href
      cy.get('h2 a').invoke('attr', 'href').then(href => {
        const slug = new URL(href).pathname.split('/').filter(Boolean).pop();
        cy.log(`Slug: ${slug}`);
        cy.wrap(href).as('articleUrl'); // Store the full URL to visit later
        cy.wrap(slug).as('slug');
      });

      // Get short description
      cy.get('.bdpp-post-desc').invoke('text').then(text => {
        cy.wrap(text.trim()).as('short');
      });

      // Get and format date
      cy.get('.bdpp-post-meta-up').invoke('text').then(dateText => {
        // Converts DD-MMM-YYYY (e.g., 01-Jan-2024) to YYYY-MM-DD
        const parsedDate = new Date(dateText.trim());
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        const date = `${year}_${month}_${day}`;
        cy.log(`Date: ${date}`);
        cy.wrap(date).as('date');
      });

      // Get image URL and download it
      cy.get('@slug').then(slug => {
        cy.root().parent().find('.bdpp-post-img-bg img').invoke('attr', 'src').then(src => {
          const extension = src.split('.').pop().split('?')[0]; // Get file extension
          const fileName = `${slug}.${extension}`;
          const folder = 'blogs/assets/article-images';
          cy.task('downloadFile', { url: src, folder, fileName }).then(filePath => {
            cy.log(`Image downloaded to: ${filePath}`);
            cy.wrap(filePath).as('imageUrl');
          });
        });
      });
    });

    // --- 2. Navigate and extract full content ---
    // Explicitly visit the URL to ensure the page is loaded before proceeding.
    cy.get('@articleUrl').then(articleUrl => {
      cy.visit(articleUrl);
    })

    cy.get('article').invoke('prop', 'outerHTML').then(rawHtml => {
      cy.log('Extracted raw article HTML. Processing...');

      // Call the new task to clean the HTML and get a list of images to download
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
            // --- 3. Assemble and save the data ---
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
