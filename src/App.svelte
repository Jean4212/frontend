<script>
	import Login from "./routes/login.svelte";
	import Home from "./routes/home.svelte";	
	import Cookies from "js-cookie";	

	let Token = Cookies.get("login");

	async function loadCookies() {		
	  	Token = await Cookies.get("login"); 		
	};  	
</script>

<main>
	{#if !Token}
		<Login on:login={loadCookies}/>	
	{:else}			
		<Home />  	
	{/if}
</main>
