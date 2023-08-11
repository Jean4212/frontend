<script>
    import {createEventDispatcher} from "svelte";

    const dispatch = createEventDispatcher();

    let inputUsername;
    let inputPassword;

    async function validate() {

        const username = inputUsername.value;
        const password = inputPassword.value;

        if (!username) {
            alert("Registra el username");
            inputUsername.focus();

        } else if (!password) {
            alert("Registra el password");
            inputPassword.focus();

        } else {                
            const user = new FormData();
            user.append("username", username);
            user.append("password", password);           

            const url = "https://api-jeanoi4212.b4a.run/login";
            const options = {method: "POST", headers: {"Content-Type": "application/x-www-form-urlencoded"}, body: new URLSearchParams(user)};

            try {
                const response = await fetch(url, options);              

                if (response.ok) {    
                    const response_json = await response.json()
                    sessionStorage.setItem("token", response_json.access_token)          
                    sessionStorage.setItem("menu", "1")
                    dispatch("login"); 
                    
                } else {
                    alert("Credenciales de autenticación inválidas");
                };

            } catch {
                alert("Sin conexion con el servidor");
            };
        };
    };
    
</script>
  
<div class="container"> 
    <div class="form">
        <img src="avatar.svg" alt="avatar" />
        <h2 class="title">Welcome</h2>
        <input type="text" class="username" placeholder="Username" bind:this={inputUsername} maxlength="10"/>                  
        <input type="password" class="password" placeholder="Password" bind:this={inputPassword} maxlength="10"/>       
        <h6 class="forgot">Forgot Password?</h6>
        <input type="submit" class="submit" value="Login" on:click={validate} />
  </div>    
</div>

<style>
    .container {       
        width: 100%;
        height: 100vh;    
        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;       
    }    
    
    .form {
        width: 260px;     
        display: flex;
        flex-direction: column; 
        justify-content: center;
        min-width: 260px;
    }
  
    img {
        height: 100px;
    }
  
    .title {
        margin: 15px 0;
        color: #333;
        text-transform: uppercase;
        font-size: 2.9rem;        
    }
    
    .username, .password{     
        text-align: center;
        height: 50px;
        border: none;
        outline: none;        
        font-size: 1.2rem;
        color: #555;  
        background: #f1f3f3;
    }

    .password {
        margin-top: 5px;
    }
    
    .forgot {    
        text-align: right;  
        margin-top: 6px;    
        color: #999;
        font-size: 0.9rem;
        cursor: pointer;        
    }
  
    .forgot:hover {
        color: #38d39f;
    }
  
    .submit {     
        margin-top: 15px;         
        height: 40px;
        border-radius: 14px;
        outline: none;
        border: none;
        background-image: linear-gradient(to right, #3dca9b, #3dca9b, #11a070);  
        background-size: 200%;     
        font-size: 1.2rem;
        color: #ebebeb;       
        text-transform: uppercase;        
        cursor: pointer;
        transition: 0.5s;
    }

    .submit:hover {
        background-position: right;  
        color: #ffffff;           
        transform: translateY(-2px);
        box-shadow: 0 6px 6px 0 rgba(0, 0, 0, 0.2);  
    }

    .username:focus, .password:focus {
        outline: 1px solid #babebe;      
    } 
</style>
  
  