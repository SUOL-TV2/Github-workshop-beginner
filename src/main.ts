const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("The application mount point was not found.");
}

app.innerHTML = `
  <h1>McSquishy: Blob on the Run</h1>
  <p>The game is coming soon.</p>
`;
