---
name: firecrawl
description: Pull clean web data — search, scrape, crawl, and interact with live pages — to feed research, SEO, and lead-gen workflows.
triggers:
  - scrape
  - crawl
  - web-research
  - firecrawl
allowedTools:
  - search
  - scrape
  - research
  - summarize
modelPreference: ollama/llama3.1:8b
contextMode: standard
approvalRequired: false
---
Collect live web context with Firecrawl and hand clean, source-traceable content to downstream skills. Search first when you need discovery, scrape when you already have a URL, and only interact (clicks, forms, login) when plain extraction is not enough. Save or cite the source URL for every claim so research, SEO, and lead-gen outputs stay traceable. Requires `FIRECRAWL_API_KEY`; the keyless free tier covers scrape/search/interact at lower limits when no key is set.
