import PDFDocument from "pdfkit";
import MarkdownIt from "markdown-it";
import axios from "axios";
import fs from "fs";
import path from "path";
import sizeOf from "image-size";

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
    });

    return Buffer.from(response.data);
  } catch (err) {
    console.log("Image download failed:", url);
    return null;
  }
}

function renderText(doc, text, options = {}) {
  doc
    .font(options.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(options.size || 12)
    .fillColor("black")
    .text(text, {
      width: 500,
      align: "left",
      lineGap: 4,
    });

  doc.moveDown(0.5);
}

async function renderImage(doc, imageUrl) {
  try {
    const imageBuffer = await downloadImage(imageUrl);

    if (!imageBuffer) return;

    const dimensions = sizeOf(imageBuffer);

    const maxWidth = 450;
    const maxHeight = 300;

    let width = dimensions.width;
    let height = dimensions.height;

    const ratio = Math.min(
      maxWidth / width,
      maxHeight / height
    );

    width *= ratio;
    height *= ratio;

    if (doc.y + height > doc.page.height - 100) {
      doc.addPage();
    }

    doc.image(imageBuffer, {
      fit: [width, height],
      align: "center",
    });

    doc.moveDown(0.7);
  } catch (err) {
    console.log("Image render failed:", imageUrl);
  }
}

export async function generateEducationalPDF(data, outputPath) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
    });

    const stream = fs.createWriteStream(outputPath);

    doc.pipe(stream);

    doc.font("Helvetica");

    for (const item of data) {
      const answer = item.answer;

      const tokens = md.parse(answer, {});

      for (const token of tokens) {
        switch (token.type) {
          case "heading_open": {
            const level = token.tag;

            break;
          }

          case "inline": {
            const prev =
              tokens[tokens.indexOf(token) - 1];

            if (prev?.type === "heading_open") {
              const level = prev.tag;

              if (level === "h1") {
                renderText(doc, token.content, {
                  size: 24,
                  bold: true,
                });
              } else if (level === "h2") {
                renderText(doc, token.content, {
                  size: 18,
                  bold: true,
                });
              } else if (level === "h3") {
                renderText(doc, token.content, {
                  size: 15,
                  bold: true,
                });
              } else {
                renderText(doc, token.content, {
                  size: 13,
                  bold: true,
                });
              }
            } else {
              const text = token.content.trim();

              if (text) {
                renderText(doc, text, {
                  size: 12,
                });
              }

              // Detect image URLs
              const urls =
                text.match(
                  /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi
                ) || [];

              for (const url of urls) {
                await renderImage(doc, url);
              }
            }

            break;
          }

          case "bullet_list_open":
            doc.moveDown(0.3);
            break;

          case "list_item_open":
            doc.text("• ", {
              continued: true,
            });
            break;

          case "fence": {
            renderText(doc, token.content, {
              size: 11,
            });
            break;
          }

          case "table_open": {
            renderText(doc, "Table:", {
              bold: true,
              size: 14,
            });
            break;
          }

          default:
            break;
        }
      }

      doc.addPage();
    }

    doc.end();

    stream.on("finish", () => {
      resolve(outputPath);
    });

    stream.on("error", reject);
  });
}