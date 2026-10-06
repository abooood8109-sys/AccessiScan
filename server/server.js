const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const { chromium } = require("playwright");
const axe = require("axe-core");
const { pool, testConnection } = require("./db");

const {
  registerUser,
  loginUser,
  authenticateToken,
  optionalAuthenticateToken,
  requireAdmin,
} = require("./auth");

const app = express();

app.use(cors());
app.use(express.json());

// --------------------------------
// HOME
// --------------------------------

app.get("/", (req, res) => {
  res.json({
    message:
      "Web Accessibility Auditor Server is running",
  });
});

// --------------------------------
// AUTH ROUTES
// --------------------------------

app.post("/auth/register", registerUser);

app.post("/auth/login", loginUser);

app.get(
  "/auth/me",
  authenticateToken,
  (req, res) => {
    res.json({
      user: req.user,
    });
  }
);

// --------------------------------
// USER AUDIT HISTORY
// --------------------------------

app.get(
  "/user/audits",
  authenticateToken,
  async (req, res) => {
    try {
      const [audits] =
        await pool.execute(
          `
          SELECT
            id,
            url,
            page_title,
            score,
            created_at
          FROM audits
          WHERE user_id = ?
          ORDER BY created_at DESC
          `,
          [req.user.id]
        );

      res.json({
        audits,
      });
    } catch (error) {
      console.error(
        "Fetch user audits error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to fetch audit history.",
      });
    }
  }
);

// --------------------------------
// ADMIN TEST
// --------------------------------

app.get(
  "/admin/test",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    res.json({
      message:
        "Admin access confirmed.",
    });
  }
);

// --------------------------------
// ADMIN STATISTICS
// --------------------------------

app.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [userCount] =
        await pool.execute(
          "SELECT COUNT(*) AS total FROM users"
        );

      const [auditCount] =
        await pool.execute(
          "SELECT COUNT(*) AS total FROM audits"
        );

      const [issueCount] =
        await pool.execute(
          "SELECT COUNT(*) AS total FROM issues"
        );

      const [averageScore] =
        await pool.execute(
          "SELECT ROUND(AVG(score)) AS average FROM audits"
        );

      res.json({
        users: userCount[0].total,
        audits: auditCount[0].total,
        issues: issueCount[0].total,
        averageScore:
          averageScore[0].average ?? 0,
      });
    } catch (error) {
      console.error(
        "Admin stats error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load admin statistics.",
      });
    }
  }
);

// --------------------------------
// ADMIN USERS
// --------------------------------

app.get(
  "/admin/users",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [users] =
        await pool.execute(
          `
          SELECT
            id,
            name,
            email,
            role,
            created_at
          FROM users
          ORDER BY created_at DESC
          `
        );

      res.json({
        users,
      });
    } catch (error) {
      console.error(
        "Admin users error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load users.",
      });
    }
  }
);

// --------------------------------
// ADMIN AUDITS
// --------------------------------

app.get(
  "/admin/audits",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [audits] =
        await pool.execute(
          `
          SELECT
            audits.id,
            audits.url,
            audits.page_title,
            audits.language,
            audits.score,
            audits.created_at,
            users.name AS user_name,
            users.email AS user_email
          FROM audits
          LEFT JOIN users
            ON audits.user_id = users.id
          ORDER BY audits.created_at DESC
          `
        );

      res.json({
        audits,
      });
    } catch (error) {
      console.error(
        "Admin audits error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load audits.",
      });
    }
  }
);

// --------------------------------
// ADMIN REPORTS
// --------------------------------

app.get(
  "/admin/reports",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [summary] =
        await pool.execute(`
          SELECT
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM audits) AS audits,
            (SELECT COUNT(*) FROM issues) AS issues,
            (
              SELECT ROUND(AVG(score))
              FROM audits
            ) AS averageScore
        `);

      const [categories] =
        await pool.execute(`
          SELECT
            category,
            COUNT(*) AS total
          FROM issues
          GROUP BY category
          ORDER BY total DESC
        `);

      const [severity] =
        await pool.execute(`
          SELECT
            severity,
            COUNT(*) AS total
          FROM issues
          GROUP BY severity
          ORDER BY total DESC
        `);

      const [topWebsites] =
        await pool.execute(`
          SELECT
            url,
            COUNT(*) AS total_audits,
            ROUND(AVG(score)) AS average_score
          FROM audits
          GROUP BY url
          ORDER BY total_audits DESC
          LIMIT 10
        `);

      res.json({
        summary: {
          users: summary[0].users,
          audits: summary[0].audits,
          issues: summary[0].issues,
          averageScore:
            summary[0].averageScore ?? 0,
        },

        categories,

        severity,

        topWebsites,
      });
    } catch (error) {
      console.error(
        "Admin reports error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load system reports.",
      });
    }
  }
);

// --------------------------------
// AUDIT DETAILS
// --------------------------------

app.get(
  "/audits/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const auditId =
        Number(req.params.id);

      if (
        !Number.isInteger(auditId) ||
        auditId <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid audit ID.",
        });
      }

      let auditQuery = `
        SELECT
          audits.id,
          audits.url,
          audits.page_title,
          audits.language,
          audits.score,
          audits.images,
          audits.images_without_alt,
          audits.links,
          audits.empty_links,
          audits.buttons,
          audits.empty_buttons,
          audits.form_controls,
          audits.controls_without_labels,
          audits.headings,
          audits.videos,
          audits.audio_elements,
          audits.videos_without_captions,
          audits.created_at,
          users.name AS user_name,
          users.email AS user_email
        FROM audits
        LEFT JOIN users
          ON audits.user_id = users.id
        WHERE audits.id = ?
      `;

      const auditParams = [auditId];

      if (req.user.role !== "admin") {
        auditQuery += `
          AND audits.user_id = ?
        `;

        auditParams.push(req.user.id);
      }

      const [audits] =
        await pool.execute(
          auditQuery,
          auditParams
        );

      if (audits.length === 0) {
        return res.status(404).json({
          message:
            "Audit not found.",
        });
      }

      const [issues] =
        await pool.execute(
          `
          SELECT
            id,
            category,
            issue_type,
            severity,
            message,
            recommendation,
            help_url,
            affected_elements,
            created_at
          FROM issues
          WHERE audit_id = ?
          ORDER BY
            CASE severity
              WHEN 'Critical' THEN 1
              WHEN 'High' THEN 2
              WHEN 'Serious' THEN 3
              WHEN 'Medium' THEN 4
              WHEN 'Moderate' THEN 5
              WHEN 'Low' THEN 6
              WHEN 'Minor' THEN 7
              ELSE 8
            END,
            id ASC
          `,
          [auditId]
        );

      return res.json({
        audit: audits[0],
        issues,
      });
    } catch (error) {
      console.error(
        "Audit details error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load audit details.",
      });
    }
  }
);

// --------------------------------
// AUDIT
// --------------------------------

app.post(
  "/audit",
  optionalAuthenticateToken,
  async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        message:
          "Please enter a website URL.",
      });
    }

    let browser = null;
    let connection = null;

    try {
      const websiteUrl =
        new URL(url);

      if (
        !["http:", "https:"].includes(
          websiteUrl.protocol
        )
      ) {
        return res.status(400).json({
          message:
            "Please enter a valid HTTP or HTTPS URL.",
        });
      }

      browser =
        await chromium.launch({
          headless: true,
        });

      const page =
        await browser.newPage();

      await page.goto(
        websiteUrl.href,
        {
          waitUntil:
            "domcontentloaded",
          timeout: 30000,
        }
      );

      await page.waitForTimeout(
        3000
      );

      const html =
        await page.content();

      const $ =
        cheerio.load(html);

      // --------------------------------
      // AXE CORE
      // --------------------------------

      await page.evaluate(
        axe.source
      );

      const axeResults =
        await page.evaluate(
          async () => {
            return await axe.run(
              document,
              {
                runOnly: {
                  type: "tag",
                  values: [
                    "wcag2a",
                    "wcag2aa",
                    "wcag21a",
                    "wcag21aa",
                  ],
                },
              }
            );
          }
        );

      // --------------------------------
      // BASIC INFORMATION
      // --------------------------------

      const title =
        $("title")
          .text()
          .trim();

      const language =
        $("html").attr(
          "lang"
        );

      // --------------------------------
      // IMAGES
      // --------------------------------

      const images =
        $("img").length;

      const imagesWithoutAlt =
        $("img").filter(
          (_, element) => {
            const alt =
              $(element).attr(
                "alt"
              );

            return (
              alt === undefined ||
              alt.trim() === ""
            );
          }
        ).length;

      // --------------------------------
      // LINKS
      // --------------------------------

      const links =
        $("a").length;

      const emptyLinks =
        $("a").filter(
          (_, element) => {
            const text =
              $(element)
                .text()
                .trim();

            const ariaLabel =
              $(element).attr(
                "aria-label"
              );

            return (
              !text &&
              !ariaLabel
            );
          }
        ).length;

      // --------------------------------
      // BUTTONS
      // --------------------------------

      const buttons =
        $("button").length;

      const emptyButtons =
        $("button").filter(
          (_, element) => {
            const text =
              $(element)
                .text()
                .trim();

            const ariaLabel =
              $(element).attr(
                "aria-label"
              );

            return (
              !text &&
              !ariaLabel
            );
          }
        ).length;

      // --------------------------------
      // FORM CONTROLS
      // --------------------------------

      const inputs = $(
        "input, select, textarea"
      ).length;

      let inputsWithoutLabel = 0;

      $(
        "input, select, textarea"
      ).each(
        (_, element) => {
          const id =
            $(element).attr(
              "id"
            );

          const ariaLabel =
            $(element).attr(
              "aria-label"
            );

          const ariaLabelledBy =
            $(element).attr(
              "aria-labelledby"
            );

          const hasLabel =
            (id &&
              $(
                `label[for="${id}"]`
              ).length > 0) ||
            $(element).closest(
              "label"
            ).length > 0;

          if (
            !hasLabel &&
            !ariaLabel &&
            !ariaLabelledBy
          ) {
            inputsWithoutLabel++;
          }
        }
      );

      // --------------------------------
      // HEADINGS
      // --------------------------------

      const headings = $(
        "h1, h2, h3, h4, h5, h6"
      ).length;

      const h1Count =
        $("h1").length;

      // --------------------------------
      // HEARING
      // --------------------------------

      const mediaInfo =
        await page.evaluate(
          () => {
            const videos =
              Array.from(
                document.querySelectorAll(
                  "video"
                )
              );

            const audios =
              Array.from(
                document.querySelectorAll(
                  "audio"
                )
              );

            const videoData =
              videos.map(
                (video) => {
                  const captionTracks =
                    Array.from(
                      video.querySelectorAll(
                        'track[kind="captions"], track[kind="subtitles"]'
                      )
                    );

                  return {
                    hasCaptions:
                      captionTracks.length >
                      0,
                  };
                }
              );

            return {
              videoCount:
                videos.length,
              audioCount:
                audios.length,
              videos:
                videoData,
            };
          }
        );

      const videos =
        mediaInfo.videoCount;

      const audioElements =
        mediaInfo.audioCount;

      const videosWithoutCaptions =
        mediaInfo.videos.filter(
          (video) =>
            !video.hasCaptions
        ).length;

      const hearingIssues = [];

      if (
        videosWithoutCaptions >
        0
      ) {
        hearingIssues.push({
          id:
            "video-without-captions",

          type:
            "Hearing Accessibility",

          severity:
            "High",

          message:
            `${videosWithoutCaptions} video(s) do not have detectable captions or subtitles.`,

          recommendation:
            "Provide accurate captions or subtitles for video content so users with hearing loss can access spoken information.",
        });
      }

      // --------------------------------
      // MOTOR
      // --------------------------------

      const motorInfo =
        await page.evaluate(
          () => {
            const positiveTabIndex =
              Array.from(
                document.querySelectorAll(
                  "[tabindex]"
                )
              ).filter(
                (element) => {
                  return (
                    Number(
                      element.getAttribute(
                        "tabindex"
                      )
                    ) > 0
                  );
                }
              ).length;

            const customInteractiveElements =
              Array.from(
                document.querySelectorAll(
                  '[onclick], [role="button"], [role="link"]'
                )
              );

            let nonKeyboardAccessible =
              0;

            customInteractiveElements.forEach(
              (element) => {
                const tagName =
                  element.tagName
                    .toLowerCase();

                const role =
                  element.getAttribute(
                    "role"
                  );

                const tabindex =
                  element.getAttribute(
                    "tabindex"
                  );

                const nativeKeyboardElement =
                  tagName ===
                    "button" ||
                  tagName ===
                    "input" ||
                  tagName ===
                    "select" ||
                  tagName ===
                    "textarea" ||
                  (tagName ===
                    "a" &&
                    element.hasAttribute(
                      "href"
                    ));

                const customKeyboardElement =
                  (role === "button" ||
                    role === "link") &&
                  tabindex !== null &&
                  Number(tabindex) >=
                    0;

                if (
                  !nativeKeyboardElement &&
                  !customKeyboardElement
                ) {
                  nonKeyboardAccessible++;
                }
              }
            );

            const scrollableElements =
              Array.from(
                document.querySelectorAll(
                  "*"
                )
              ).filter(
                (element) => {
                  const style =
                    window.getComputedStyle(
                      element
                    );

                  const scrollable =
                    style.overflowY ===
                      "auto" ||
                    style.overflowY ===
                      "scroll" ||
                    style.overflowX ===
                      "auto" ||
                    style.overflowX ===
                      "scroll";

                  const hasOverflow =
                    element.scrollHeight >
                      element.clientHeight ||
                    element.scrollWidth >
                      element.clientWidth;

                  return (
                    scrollable &&
                    hasOverflow
                  );
                }
              );

            let scrollableNotFocusable =
              0;

            scrollableElements.forEach(
              (element) => {
                const tabindex =
                  element.getAttribute(
                    "tabindex"
                  );

                const tagName =
                  element.tagName
                    .toLowerCase();

                const focusable =
                  tabindex !== null &&
                  Number(tabindex) >=
                    0;

                const nativeFocusable =
                  tagName ===
                    "button" ||
                  tagName ===
                    "input" ||
                  tagName ===
                    "select" ||
                  tagName ===
                    "textarea";

                if (
                  !focusable &&
                  !nativeFocusable
                ) {
                  scrollableNotFocusable++;
                }
              }
            );

            return {
              positiveTabIndex,
              nonKeyboardAccessible,
              scrollableNotFocusable,
            };
          }
        );

      const motorIssues = [];

      if (
        motorInfo.positiveTabIndex >
        0
      ) {
        motorIssues.push({
          id:
            "positive-tabindex",

          type:
            "Motor Accessibility",

          severity:
            "Medium",

          message:
            `${motorInfo.positiveTabIndex} element(s) use a positive tabindex value.`,

          recommendation:
            "Avoid positive tabindex values and use the natural keyboard navigation order.",
        });
      }

      if (
        motorInfo.nonKeyboardAccessible >
        0
      ) {
        motorIssues.push({
          id:
            "keyboard-accessibility",

          type:
            "Motor Accessibility",

          severity:
            "High",

          message:
            `${motorInfo.nonKeyboardAccessible} custom interactive element(s) may not be keyboard accessible.`,

          recommendation:
            "Make interactive elements reachable and usable with the keyboard.",
        });
      }

      if (
        motorInfo.scrollableNotFocusable >
        0
      ) {
        motorIssues.push({
          id:
            "scrollable-region-focus",

          type:
            "Motor Accessibility",

          severity:
            "Medium",

          message:
            `${motorInfo.scrollableNotFocusable} scrollable region(s) may not be keyboard accessible.`,

          recommendation:
            "Ensure important scrollable regions can receive keyboard focus when needed.",
        });
      }

      // --------------------------------
      // COGNITIVE
      // --------------------------------

      const cognitiveInfo =
        await page.evaluate(
          () => {
            const mainExists =
              document.querySelector(
                "main"
              ) ||
              document.querySelector(
                '[role="main"]'
              );

            const navElements =
              document.querySelectorAll(
                "nav, [role='navigation']"
              );

            const visibleLinks =
              Array.from(
                document.querySelectorAll(
                  "a"
                )
              ).filter(
                (element) => {
                  const style =
                    window.getComputedStyle(
                      element
                    );

                  return (
                    style.display !==
                      "none" &&
                    style.visibility !==
                      "hidden"
                  );
                }
              );

            const genericLinkTexts = [
              "click here",
              "here",
              "read more",
              "learn more",
              "more",
            ];

            let genericLinks = 0;

            visibleLinks.forEach(
              (link) => {
                const text = (
                  link.innerText ||
                  link.getAttribute(
                    "aria-label"
                  ) ||
                  ""
                )
                  .trim()
                  .toLowerCase();

                if (
                  genericLinkTexts.includes(
                    text
                  )
                ) {
                  genericLinks++;
                }
              }
            );

            const headingElements =
              Array.from(
                document.querySelectorAll(
                  "h1, h2, h3, h4, h5, h6"
                )
              );

            let headingLevelJumps =
              0;

            for (
              let i = 1;
              i <
              headingElements.length;
              i++
            ) {
              const previousLevel =
                Number(
                  headingElements[
                    i - 1
                  ].tagName.substring(
                    1
                  )
                );

              const currentLevel =
                Number(
                  headingElements[
                    i
                  ].tagName.substring(
                    1
                  )
                );

              if (
                currentLevel >
                previousLevel +
                  1
              ) {
                headingLevelJumps++;
              }
            }

            return {
              hasMain:
                Boolean(mainExists),

              navigationCount:
                navElements.length,

              visibleLinks:
                visibleLinks.length,

              genericLinks,

              headingLevelJumps,
            };
          }
        );

      const cognitiveIssues = [];

      if (
        !cognitiveInfo.hasMain
      ) {
        cognitiveIssues.push({
          id:
            "missing-main-landmark",

          type:
            "Cognitive Accessibility",

          severity:
            "Medium",

          message:
            "The page does not contain a clear main content landmark.",

          recommendation:
            "Use a main element or main landmark to make page structure easier to understand and navigate.",
        });
      }

      if (
        cognitiveInfo.visibleLinks >
          5 &&
        cognitiveInfo.navigationCount ===
          0
      ) {
        cognitiveIssues.push({
          id:
            "missing-navigation-landmark",

          type:
            "Cognitive Accessibility",

          severity:
            "Medium",

          message:
            "The page contains many links but no clear navigation landmark.",

          recommendation:
            "Use a navigation landmark to make important navigation areas easier to identify.",
        });
      }

      if (
        cognitiveInfo.genericLinks >
        0
      ) {
        cognitiveIssues.push({
          id:
            "generic-link-text",

          type:
            "Cognitive Accessibility",

          severity:
            "Medium",

          message:
            `${cognitiveInfo.genericLinks} link(s) use generic text such as "click here" or "read more".`,

          recommendation:
            "Use clear link text that describes the destination or purpose of the link.",
        });
      }

      if (
        cognitiveInfo.headingLevelJumps >
        0
      ) {
        cognitiveIssues.push({
          id:
            "heading-order",

          type:
            "Cognitive Accessibility",

          severity:
            "Medium",

          message:
            `${cognitiveInfo.headingLevelJumps} heading level jump(s) were detected.`,

          recommendation:
            "Use a logical heading hierarchy to make page structure easier to understand.",
        });
      }

      // --------------------------------
      // GENERAL ISSUES
      // --------------------------------

      const customIssues = [];

      if (!title) {
        customIssues.push({
          id:
            "missing-page-title",

          type:
            "Page Title",

          severity:
            "High",

          message:
            "The page does not have a title.",

          recommendation:
            "Add a clear and descriptive title for the webpage.",
        });
      }

      if (!language) {
        customIssues.push({
          id:
            "missing-language",

          type:
            "Language",

          severity:
            "Medium",

          message:
            "The page does not define a language.",

          recommendation:
            'Add a language attribute such as lang="en".',
        });
      }

      if (
        imagesWithoutAlt > 0
      ) {
        customIssues.push({
          id:
            "images-without-alt",

          type:
            "Images",

          severity:
            "High",

          message:
            `${imagesWithoutAlt} image(s) do not have alternative text.`,

          recommendation:
            'Add meaningful alt text to informative images. Use alt="" for decorative images.',
        });
      }

      if (emptyLinks > 0) {
        customIssues.push({
          id:
            "empty-links",

          type:
            "Links",

          severity:
            "High",

          message:
            `${emptyLinks} link(s) do not have accessible text.`,

          recommendation:
            "Add visible link text or an appropriate aria-label.",
        });
      }

      if (
        emptyButtons > 0
      ) {
        customIssues.push({
          id:
            "empty-buttons",

          type:
            "Buttons",

          severity:
            "High",

          message:
            `${emptyButtons} button(s) do not have accessible names.`,

          recommendation:
            "Add visible button text or an appropriate aria-label.",
        });
      }

      if (
        inputsWithoutLabel > 0
      ) {
        customIssues.push({
          id:
            "form-labels",

          type:
            "Form Labels",

          severity:
            "High",

          message:
            `${inputsWithoutLabel} form control(s) do not have accessible labels.`,

          recommendation:
            "Associate every form control with a label or accessible name.",
        });
      }

      if (h1Count === 0) {
        customIssues.push({
          id:
            "missing-h1",

          type:
            "Headings",

          severity:
            "Medium",

          message:
            "The page does not contain an H1 heading.",

          recommendation:
            "Add one clear H1 heading that describes the main page content.",
        });
      }

      // --------------------------------
      // VISUAL
      // --------------------------------

      const visualIssues =
        axeResults.violations
          .filter(
            (violation) =>
              violation.id ===
                "color-contrast" ||
              violation.id ===
                "link-in-text-block" ||
              violation.id ===
                "meta-viewport"
          )
          .map(
            (violation) => ({
              id:
                violation.id,

              type:
                "Visual Accessibility",

              severity:
                violation.impact
                  ? violation.impact
                      .charAt(0)
                      .toUpperCase() +
                    violation.impact.slice(
                      1
                    )
                  : "Unknown",

              message:
                violation.description,

              recommendation:
                violation.help,

              helpUrl:
                violation.helpUrl,

              nodes:
                violation.nodes.map(
                  (node) => ({
                    target:
                      node.target,

                    html:
                      node.html,
                  })
                ),
            })
          );

      // --------------------------------
      // AXE VIOLATIONS
      // --------------------------------

      const violations =
        axeResults.violations.map(
          (violation) => ({
            id:
              violation.id,

            type:
              "WCAG Rule",

            severity:
              violation.impact
                ? violation.impact
                    .charAt(0)
                    .toUpperCase() +
                  violation.impact.slice(
                    1
                  )
                : "Unknown",

            message:
              violation.description,

            recommendation:
              violation.help,

            helpUrl:
              violation.helpUrl,

            nodes:
              violation.nodes.map(
                (node) => ({
                  target:
                    node.target,

                  html:
                    node.html,
                })
              ),
          })
        );

      const passedRules =
        axeResults.passes.map(
          (item) => ({
            id:
              item.id,

            description:
              item.description,

            help:
              item.help,
          })
        );

      // --------------------------------
      // ALL ISSUES
      // --------------------------------

      const allIssues = [
        ...customIssues,
        ...violations,
        ...hearingIssues,
        ...motorIssues,
        ...cognitiveIssues,
      ];

      // --------------------------------
      // SCORE
      // --------------------------------

      let score = 100;

      score -= Math.min(
        imagesWithoutAlt * 2,
        20
      );

      score -= Math.min(
        emptyLinks,
        15
      );

      score -= Math.min(
        emptyButtons,
        15
      );

      score -= Math.min(
        inputsWithoutLabel * 3,
        15
      );

      score -= Math.min(
        videosWithoutCaptions * 5,
        15
      );

      score -= Math.min(
        motorInfo.positiveTabIndex *
          2,
        10
      );

      score -= Math.min(
        motorInfo.nonKeyboardAccessible *
          5,
        20
      );

      score -= Math.min(
        motorInfo.scrollableNotFocusable *
          3,
        10
      );

      score -= Math.min(
        cognitiveInfo.genericLinks *
          2,
        10
      );

      score -= Math.min(
        cognitiveInfo.headingLevelJumps *
          3,
        10
      );

      if (
        !cognitiveInfo.hasMain
      ) {
        score -= 5;
      }

      if (
        cognitiveInfo.visibleLinks >
          5 &&
        cognitiveInfo.navigationCount ===
          0
      ) {
        score -= 5;
      }

      if (!title) {
        score -= 10;
      }

      if (!language) {
        score -= 5;
      }

      if (h1Count === 0) {
        score -= 5;
      }

      axeResults.violations.forEach(
        (violation) => {
          if (
            violation.impact ===
            "critical"
          ) {
            score -= 20;
          } else if (
            violation.impact ===
            "serious"
          ) {
            score -= 15;
          } else if (
            violation.impact ===
            "moderate"
          ) {
            score -= 8;
          } else if (
            violation.impact ===
            "minor"
          ) {
            score -= 3;
          }
        }
      );

      score = Math.max(
        0,
        score
      );

      // --------------------------------
      // SAVE AUDIT
      // --------------------------------

      connection =
        await pool.getConnection();

      await connection.beginTransaction();

      const userId =
        req.user
          ? req.user.id
          : null;

      const [
        auditResult,
      ] =
        await connection.execute(
          `
          INSERT INTO audits (
            user_id,
            url,
            page_title,
            language,
            score,
            images,
            images_without_alt,
            links,
            empty_links,
            buttons,
            empty_buttons,
            form_controls,
            controls_without_labels,
            headings,
            videos,
            audio_elements,
            videos_without_captions
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            userId,
            url,
            title || null,
            language || null,
            score,
            images,
            imagesWithoutAlt,
            links,
            emptyLinks,
            buttons,
            emptyButtons,
            inputs,
            inputsWithoutLabel,
            headings,
            videos,
            audioElements,
            videosWithoutCaptions,
          ]
        );

      const auditId =
        auditResult.insertId;

      for (
        const issue of allIssues
      ) {
        let category =
          "General";

        if (
          issue.type ===
          "Visual Accessibility"
        ) {
          category =
            "Visual";
        } else if (
          issue.type ===
          "Hearing Accessibility"
        ) {
          category =
            "Hearing";
        } else if (
          issue.type ===
          "Motor Accessibility"
        ) {
          category =
            "Motor";
        } else if (
          issue.type ===
          "Cognitive Accessibility"
        ) {
          category =
            "Cognitive";
        } else if (
          issue.type ===
          "WCAG Rule"
        ) {
          category =
            "WCAG";
        }

        const affectedElements =
          issue.nodes
            ? JSON.stringify(
                issue.nodes
              )
            : null;

        await connection.execute(
          `
          INSERT INTO issues (
            audit_id,
            category,
            issue_type,
            severity,
            message,
            recommendation,
            help_url,
            affected_elements
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            auditId,
            category,
            issue.id ||
              issue.type ||
              "accessibility-issue",
            issue.severity ||
              "Unknown",
            issue.message ||
              "",
            issue.recommendation ||
              "",
            issue.helpUrl ||
              null,
            affectedElements,
          ]
        );
      }

      await connection.commit();

      // --------------------------------
      // RESPONSE
      // --------------------------------

      res.json({
        message:
          "Website audited successfully.",

        results: {
          auditId,

          url,

          title:
            title ||
            "No title found",

          language:
            language ||
            "Not specified",

          images,
          imagesWithoutAlt,

          links,
          emptyLinks,

          buttons,
          emptyButtons,

          inputs,
          inputsWithoutLabel,

          headings,
          h1Count,

          videos,
          audioElements,
          videosWithoutCaptions,

          score,

          customIssues,
          allIssues,

          visualIssues,
          hearingIssues,

          motorIssues,
          motorInfo,

          cognitiveIssues,
          cognitiveInfo,

          axe: {
            violations,
            passedRules,
            incomplete:
              axeResults.incomplete
                .length,
          },
        },
      });
    } catch (error) {
      if (connection) {
        try {
          await connection.rollback();
        } catch (
          rollbackError
        ) {
          console.error(
            "Rollback error:",
            rollbackError.message
          );
        }
      }

      console.error(
        "Audit error:",
        error
      );

      res.status(400).json({
        message:
          "Unable to analyze this website.",

        error:
          error.message,
      });
    } finally {
      if (connection) {
        connection.release();
      }

      if (browser) {
        await browser.close();
      }
    }
  }
);

// --------------------------------
// SERVER
// --------------------------------

const PORT =
  process.env.PORT || 5000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);

testConnection().catch(() => {
  process.exit(1);
});