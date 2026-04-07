# Project Documentation

## Project Title

Spectre Academy Admission Portal

## Overview

This project is a frontend admission portal for a secondary school. It provides applicants with a structured, multi-step application form that collects personal details, education history, guardian information, and a final review before submission.

## Problem Statement

Traditional admission forms can feel overwhelming, outdated, and difficult to complete on mobile devices. This project solves that by presenting the process in a guided, modern, and user-friendly interface.

## Objectives

- Build a clean and responsive frontend admission portal
- Improve the user experience with clear progress tracking
- Validate user input before submission
- Preserve form progress with local storage
- Present a stronger school identity through custom branding

## Features

- Multi-step admission workflow
- Progress bar and step indicators
- Inline validation and helper feedback
- Review and confirmation screen
- Local storage persistence
- Responsive layout for desktop and mobile
- Custom Spectre Academy branding, logo, and favicon

## Tools Used

- HTML5
- CSS3
- Vanilla JavaScript
- SVG for logo and favicon design

## Design Decisions

- A dark navy and cyan palette was chosen to give the product a more premium and futuristic identity.
- The layout separates form content from the visual sidebar to reduce cognitive load.
- The logo uses a shield motif to reinforce an academic identity while still feeling modern.

## Responsiveness

The interface adapts across desktop, tablet, and mobile screens. Key UI elements such as the sidebar and badge simplify on smaller screens to preserve readability and usability.

## Folder Structure

```text
spectre academy/
|-- assets/
|   |-- favicon.svg
|   `-- spectre-logo.svg
|-- docs/
|   |-- COLOR-PALETTE.md
|   |-- PROJECT_DOCUMENTATION.md
|   `-- Spectre-Academy-Presentation.pdf
|-- screenshots/
|   |-- desktop-home.png
|   |-- review-step.png
|   `-- mobile-home.png
|-- index.html
|-- script.js
|-- style.css
`-- README.md
```

## How To Run Locally

1. Download or clone the repository.
2. Open [`index.html`](../index.html) in a browser.

## Future Improvements

- Connect the form to a backend service
- Add file upload support for academic records
- Send real confirmation emails
- Add an admin dashboard for reviewing applications

## Author

Prepared by [Joshua Abefe](https://joshuaabefe.github.io) as a frontend submission package for Spectre Academy Admission Portal.
