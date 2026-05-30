# ralph.sh
# Usage: ./ralph.sh <iterations>

set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

touch .ralphloop/progress.txt

for ((i=1; i<=$1; i++)); do
  echo "Iteration $i"
  echo "--------------------------------"

  result=$(claude --permission-mode acceptEdits -p "@.ralphloop/sprint.json @.ralphloop/progress.txt
Iteration $i. Work ONE item only.
1. PICK — highest-priority item where passes=false and pr_number=null. Your call on priority.
   All done? Output <promise>COMPLETE</promise> and stop.
2. IMPLEMENT — run /tdd. Write tests first. No implementation before tests. Mandatory.
3. VERIFY — npm run type-check && npm run test. Both green before continuing.
4. PR — gh pr create. Body must include \"Closes #<issue_number>\" and test plan checklist.
5. UPDATE SPRINT — set passes=true and pr_number=<number> on the item.
6. LOG — append to .ralphloop/progress.txt:

<progress-template>

---

- Iteration: $i
- Timestamp: <UTC>
- Input Tokens: <n>
- Output Tokens: <n>
- Context Window Used: <% (rawK)>
- 5H Usage: <% if known>
- Reset In: <time if known>
- Item: <item id>
- Issue: #<issue_number>
- PR: <pr_number>
- TDD Used: true

<what was done, files changed, key decisions>

Next: <highest-priority remaining item and why>

</progress-template>

7. COMMIT — feat: <description> (issue #<issue_number>)
")

  echo "$text"
  if [[ "$text" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete, exiting."
    exit 0
  fi
done
