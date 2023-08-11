<script>
	import Login from "./login.svelte";
	import Home from "./home.svelte";	

	let token = sessionStorage.getItem("token");

	async function login_user() {		
		token = sessionStorage.getItem("token");	
	}; 
</script>

<main>
	{#if !token}
		<Login on:login={login_user}/>	
	{:else}			
		<Home />  	
	{/if}
</main>
