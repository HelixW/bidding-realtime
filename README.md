<!-- PROJECT SHIELDS -->

[![Dependencies][dependencies-shield]][dependencies-url]
[![Issues][issues-shield]][issues-url]
[![Size][size-shield]][size-url]
[![LinkedIn][linkedin-shield]][linkedin-url]
[![License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/helixw/bidding-realtime">
    <img src="https://i.imgur.com/wkQe8KJ.png" alt="Logo">
  </a>

  <h3 align="center">Auction Web Socket Backend</h3>

  <p align="center">
    Server deals with realtime socket transfers used for the auction rounds. It supplies bid history and bidding functionality.
    <br />
    <br />
    <a href="https://github.com/HelixW/bidding-realtime/issues">Report Bug</a>
    ·
    <a href="https://github.com/HelixW/bidding-realtime/issues">Request Feature</a>
  </p>
</p>

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgements">Acknowledgements</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

The project was created to provide realtime functionality for the auction in ACM-VIT's Reverse Coding event in 2020. 

The server allows bids to take place on questions and returns success and error responses with a live bid history.

### Built With

- [Express.js](https://expressjs.com/)
- [Socket.io](https://socket.io/)
- [Firebase](https://firebase.google.com/)

<!-- GETTING STARTED -->

## Getting Started

The project runs on Node.js utilizing npm as the package manager.

### Prerequisites

Make sure you have node.js version 8 or above to run this project.

### Installation

1. Clone the repository

   ```sh
   git clone https://github.com/HelixW/bidding-realtime.git
   ```

2. Install NPM packages
   ```sh
   npm install
   ```
3. Create a `.env` file using the configuration in `.env.example`
   ```sh
   touch .env
   ```
4. Start the development server
   ```sh
   npm run watch
   ```

<!-- USAGE -->

## Usage
The server serves a html template at `/` for testing which offers full functionality. Use a the template to place bids.

When developing client side code for the server, use the `socket.io-client` package for easy configuration.

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` for more information.

<!-- CONTACT -->

## Contact

Shreyas K. - [Linkedin](https://www.linkedin.com/in/shreyas-k-0aa77018b) - <a href="mailto:shreyas.2000@hotmail.com">Business Email</a>

Project Link - [https://github.com/HelixW/bidding-realtime](https://github.com/HelixW/bidding-realtime)

<!-- ACKNOWLEDGEMENTS -->

## Acknowledgements

- [Socket.io Client](https://socket.io/docs/v3/client-api/index.html)
- [GOT](https://github.com/sindresorhus/got)
- [JSONWebToken](https://jwt.io)
- [Socket.io JWT](https://www.npmjs.com/package/socketio-jwt)

<!-- LINKS & IMAGES -->

[dependencies-shield]: https://img.shields.io/david/HelixW/bidding-realtime?style=for-the-badge
[dependencies-url]: https://github.com/HelixW/bidding-realtime/blob/master/package.json
[issues-shield]: https://img.shields.io/github/issues-raw/HelixW/bidding-realtime?style=for-the-badge
[issues-url]: https://github.com/HelixW/bidding-realtime/issues
[size-shield]: https://img.shields.io/github/repo-size/helixw/bidding-realtime?style=for-the-badge
[size-url]: https://github.com/helixw/bidding-realtime
[license-shield]: https://img.shields.io/github/license/HelixW/bidding-realtime?style=for-the-badge
[license-url]: https://github.com/HelixW/bidding-realtime/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/Linkedin-View_Profile-blue?style=for-the-badge&logo=linkedin
[linkedin-url]: https://www.linkedin.com/in/shreyas-k-0aa77018b