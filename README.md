# Obsidian Print With Includes Plugin

This plugin allows you to include markdown files based on links in headlines.

If you have one file with a headline like

```markdown
## [[path/to/file.md|headline]]

foo bar lorem ipsum
```

this plugin will inclue the content of `path/to/file.md` into your current markdown file.

The result will be:

```markdown
## headline

full content of `path/to/file.md`

foo bar lorem ipsum
```

Of course, this will work recursively.

In case of any questions, feel free to open an issue.

## Support

I have not the time (yet) to provide professional support for this project.
But feel free to submit issues and PRs, I'll check for it and honor your contributions.

## License

The whole project is licensed under MIT license. Stay fair.

Gerrit Beine, 2022
