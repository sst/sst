import { A } from "@solidjs/router";

function Nav() {
  return (
    <header class="header">
      <nav class="inner">
        <A href="/">
          <strong>HN</strong>
        </A>
        <A href="/new">
          <strong>New</strong>
        </A>
        <A href="/show">
          <strong>Show</strong>
        </A>
        <A href="/ask">
          <strong>Ask</strong>
        </A>
        <A href="/job">
          <strong>Jobs</strong>
        </A>
        <a class="github" href="http://github.com/solidjs/solid" target="_blank" rel="noreferrer">
          Built with Solid
        </a>
      </nav>
    </header>
  );
}

export default Nav;
