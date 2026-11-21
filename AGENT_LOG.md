
# Agent log

One entry per agent session, newest at the bottom.

## 2026-11-21 · Gemini CLI initial session

- Goal: Start Gemini CLI in GitHub Codespaces.
- Delegated: Test the agent with a simple greeting.
- Checkpoints: Gemini CLI started and detected one MCP server.
- Went wrong: The initial request took too long. After exiting Gemini, the /mcp command was accidentally entered in the Bash terminal.
- Changed by hand: Restarted Gemini CLI.

## 2026-11-21 · Exercise 1 MCP integration

- Goal: Verify that Gemini can discover and use both MCP tools.
- Delegated: Ask Gemini what lecture 5 is about and which lectures cover HTTP.
- Checkpoints: The MCP server was ready with two tools. Gemini correctly selected find_lecture and search_lectures.
- Went wrong: No errors occurred during these two tool calls.
- Changed by hand: No server code changes during this session.

## 2026-11-21 · Description experiment

- Goal: Evaluate whether modifying the find_lecture description changes the model's tool selection.
- Delegated: Repeat the same two prompts using Gemini CLI after modifying the tool description.
- Checkpoints: Both tools were selected correctly before and after the modification. All 12 self-checks passed before and after the change.
- Went wrong: No improvement in tool selection was observed because both descriptions already produced correct results for the tested prompts.
- Changed by hand: Updated the find_lecture description in server.js with assistance from ChatGPT, restarted Gemini CLI, reran the self-checks, and updated mcp-server/README.md with the experiment results.
