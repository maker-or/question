/**
 * Convert HTML content to Markdown format
 * This is a simplified implementation - for production use, consider using a library like turndown
 */
export function htmlToMarkdown(html: string): string {
  let markdown = html;
  
  // Handle headings
  markdown = markdown
    .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
    .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
    .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n');
  
  // Handle formatting
  markdown = markdown
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<b>(.*?)<\/b>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<i>(.*?)<\/i>/g, '*$1*');
  
  // Handle links
  markdown = markdown.replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)');
  
  // Handle code blocks
  markdown = markdown.replace(
    /<pre><code(?:\s+class="language-(.*?)")?>([^]*?)<\/code><\/pre>/g, 
    (_, lang, code) => `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``
  );
  
  // Handle inline code
  markdown = markdown.replace(/<code>(.*?)<\/code>/g, '`$1`');
  
  // Handle lists
  markdown = markdown
    .replace(/<ul>([^]*?)<\/ul>/g, (_, content) => {
      return content.replace(/<li>(.*?)<\/li>/g, '* $1\n');
    })
    .replace(/<ol>([^]*?)<\/ol>/g, (_, content) => {
      let i = 1;
      return content.replace(/<li>(.*?)<\/li>/g, () => `${i++}. $1\n`);
    });
  
  // Handle paragraphs and line breaks
  markdown = markdown
    .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<br\s*\/?>/g, '\n');
  
  // Handle blockquotes
  markdown = markdown.replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n');
  
  // Handle horizontal rules
  markdown = markdown.replace(/<hr\s*\/?>/g, '---\n\n');
  
  // Clean up HTML entities
  markdown = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
  
  // Remove any remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  return markdown.trim();
}
