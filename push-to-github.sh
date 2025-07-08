#!/bin/bash

# Script to push Piano Inversions Trainer to GitHub

echo "Pushing Piano Inversions Trainer to GitHub..."

# First, let's commit any changes made since the initial commit
cd "/Users/aaronamir/Desktop/inversions app"

# Check if there are any changes to commit
if ! git diff-index --quiet HEAD --; then
    echo "Committing recent changes..."
    git add -A
    git commit -m "Update tempo settings and final adjustments"
fi

# Check if user is authenticated with GitHub CLI
if ! gh auth status &>/dev/null; then
    echo "You need to authenticate with GitHub first."
    echo "Run: gh auth login"
    echo "Then run this script again."
    exit 1
fi

# Create the repository on GitHub
echo "Creating repository on GitHub..."
gh repo create piano-inversions-trainer \
    --public \
    --source . \
    --remote origin \
    --description "A web app for practicing piano chord inversions with visual guidance and metronome timing" \
    --push

# If repo creation failed (maybe it already exists), just push
if [ $? -ne 0 ]; then
    echo "Repository might already exist. Trying to push..."
    git remote add origin https://github.com/$(gh api user -q .login)/piano-inversions-trainer.git 2>/dev/null || true
    git branch -M main
    git push -u origin main
fi

echo ""
echo "✅ Successfully pushed to GitHub!"
echo ""
echo "Your repository is now available at:"
echo "https://github.com/$(gh api user -q .login)/piano-inversions-trainer"
echo ""
echo "To enable GitHub Pages (free hosting):"
echo "1. Go to your repository Settings"
echo "2. Navigate to Pages section"
echo "3. Under 'Source', select 'Deploy from a branch'"
echo "4. Choose 'main' branch and '/ (root)' folder"
echo "5. Click Save"
echo ""
echo "Your app will be live at: https://$(gh api user -q .login).github.io/piano-inversions-trainer/"