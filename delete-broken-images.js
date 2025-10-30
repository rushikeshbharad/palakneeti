const fs = require('fs/promises'); // Use promises version for async/await
const path = require('path');

// --- Configuration ---
const IMAGE_DIRECTORY = path.join(__dirname, "assets", "article-images");
const CDN_BASE_URL = "https://cdn.jsdelivr.net/gh/rushikeshbharad/palakneeti/assets/article-images/";

/**
 * Checks if an image is accessible on the CDN and deletes it locally if not.
 */
async function checkAndCleanImages() {
    console.log(`Checking images in: ${IMAGE_DIRECTORY}`);
    try {
        const files = await fs.readdir(IMAGE_DIRECTORY);
        console.log(`Found ${files.length} files to check.`);

        // Use Promise.all to run checks in parallel for better performance
        const checkPromises = files.map(async (filename) => {
            // Ignore non-image files or system files like .DS_Store
            if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) {
                console.log(`- [SKIPPING] ${filename} (not a standard image file).`);
                return;
            }

            const imageUrl = `${CDN_BASE_URL}${filename}`;
            const localImagePath = path.join(IMAGE_DIRECTORY, filename);

            try {
                // Use a HEAD request for efficiency; we only need the status code.
                // Set `redirect: 'manual'` to prevent following redirects.
                // A redirect from jsDelivr often means the file doesn't exist at the requested URL.
                const response = await fetch(imageUrl, { method: 'HEAD', redirect: 'manual' });

                // A successful response should be `ok` (status 200-299) and of type `basic` (not a redirect).
                // `response.type` will be 'opaqueredirect' if a redirect occurred.
                if (response.ok && response.type === 'basic') {
                    console.log(`✅ [KEEPING] ${filename} is accessible on the CDN.`);
                } else {
                    console.log(`❌ [DELETING] ${filename} is broken (Status: ${response.status}).`);
                    await fs.unlink(localImagePath);
                    console.log(`   -> Deleted ${localImagePath}`);
                }
            } catch (error) {
                console.error(`   -> Error checking ${filename}: ${error.message}. Skipping file.`);
            }
        });

        await Promise.all(checkPromises);
        console.log("\nImage check and cleanup complete.");

    } catch (error) {
        console.error(`Failed to read directory ${IMAGE_DIRECTORY}:`, error);
    }
}

// Run the script
checkAndCleanImages();
