caffeinate -ims claude --permission-mode acceptEdits -p "@$1 @.loop/prompts/review-prompt-2.md"
alerter --sound default --message "Pick issue $1 ended" --timeout 10 &