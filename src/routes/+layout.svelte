<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>MusicMath — Reactive Production Toolkit</title>
	<meta name="description" content="Offline-first standalone acoustic and rhythmic conversion utilities for professional producers, audio engineers, and microtonal musicians." />
</svelte:head>

<div class="app-container">
	<header class="header">
		<h1>MusicMath</h1>
		<p>Reactive Production & Acoustic Calculation Toolkit</p>
	</header>

	<main>
		{@render children()}
	</main>
</div>
