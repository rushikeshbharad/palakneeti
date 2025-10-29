# palakneeti

Parameters for each article

- Authors (name { marathi, english }, picture, email, short description { marathi, english })
- ⁠Translators (name { marathi, english }, picture, email, short description { marathi, english })
- Verbalizer (name { marathi, english }, picture, email, short description { marathi, english })
- Conceptualist (name { marathi, english }, picture, email, short description { marathi, english })
- ⁠Title { marathi, english }
- ⁠Short description of article { marathi, english }
- ⁠Content (paragraphs and images) { marathi: `<article></article>`, english: `<article></article>` }
- Tags (one article can have multiple tags; each tag is equivalent to a category; one article can appear under multiple categories) { marathi, english }
- ⁠Primary image of article

Files architecture:

- blogs/constants/articles/YYYY_MM_DD_slug.js
  ```
  exports const article = {
    content: { marathi: "", english: "" },
    title: { marathi: "", english: "" },
    short: { marathi: "", english: "" },
    author,
    translator,
    verbalizer,
    conceptualist,
    tags: [],
    image,
    verified: { marathi: bool, english: bool }
  }
  ```
- blogs/constants/tags.js
  ```
  exports const tags = {
    tag_key1: {
      marathi: "tag1_in_marathi",
      english: "tag1"
    },
    ...
  }
  ```
- blogs/constants/persona.js
  ```
  exports const personas = {
    first_last: {
      name: { marathi: "", english: "" },
      picture,
      email,
      short: { marathi: "", english: "" }
    },
    ...
  }
  ```
- blogs/assets/personas/first_last.jpg
- blogs/assets/articleImages/slug_{n}.jpg

Article images, anchor and extra divs
- Get title, short and image from tile, click title (get isMarathi boolean from title)
- Get all the img tags in article, download the image, store it in blogs/assets/articleImages/ with slug_{n} and keep alt as is
- Get all anchor tags, add target="_blank" if already not there, if href starts with palakneeti.in/, just keep the slug
- Remove bottom divs with share links - create share links by our own - check how addtoany.com works
