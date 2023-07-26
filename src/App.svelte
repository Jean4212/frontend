<script>
	import Login from "./routes/login.svelte";
	import Home from "./routes/home.svelte";	

	let token = sessionStorage.getItem("token");

	async function login_user() {		
		token = sessionStorage.getItem("token");	
	};  	
	
	let api = fetch("https://api-jeanoi4212.b4a.run");
</script>

<main>
	{#if !token}
		<Login on:login={login_user}/>	
	{:else}			
		<Home />  	
	{/if}
</main>
