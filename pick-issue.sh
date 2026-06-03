caffeinate -ims claude --permission-mode acceptEdits -p "@.loop/prompts/implement-prompt-2.md #$1"
alerter --sound default --message "Pick issue $1 ended" --timeout 10 > /dev/null 2>&1 &