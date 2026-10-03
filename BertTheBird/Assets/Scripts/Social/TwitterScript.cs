////////////////////////////////////////////////////////////////////////////////
//  
// @module Mobile Social Plugin 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////


using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

public class TwitterScript : MonoBehaviour {


	//Replace with your key and secret
	//private static string TWITTER_CONSUMER_KEY = "D8uFJnBBE4VblGwgMnOIiAcu0";
	//private static string TWITTER_CONSUMER_SECRET = "kfnWtXNogbvGlFxULveASQluaOmZz3YrEcqU3ff3jwSWwR0s91";

	[HideInInspector]
	public bool IsUserInfoLoaded = false;
	[HideInInspector]
	public bool IsAuntifivated = false;
    

	void Awake() {

		SPTwitter.instance.addEventListener(TwitterEvents.TWITTER_INITED,  OnInit);
		SPTwitter.instance.addEventListener(TwitterEvents.AUTHENTICATION_SUCCEEDED,  OnAuth);
		
		SPTwitter.instance.addEventListener(TwitterEvents.POST_SUCCEEDED,  OnPost);
		SPTwitter.instance.addEventListener(TwitterEvents.POST_FAILED,  OnPostFailed);
		
		SPTwitter.instance.addEventListener(TwitterEvents.USER_DATA_LOADED,  OnUserDataLoaded);
		SPTwitter.instance.addEventListener(TwitterEvents.USER_DATA_FAILED_TO_LOAD,  OnUserDataLoadFailed);

		
		SPTwitter.instance.Init();

	}
	
	public void LogIn() {
		SPTwitter.instance.AuthenticateUser();
	}

	public void LogOut() {
		IsUserInfoLoaded = false;
		IsAuntifivated = false;
		SPTwitter.instance.LogOut();
	}

	public void PostHighScore (ObscuredInt reward) {
        Statics.Reward = reward;
        if (!IsAuntifivated) {
			Statics.PendingSocalPost = true;
			LogIn();
            return;
        }
        
		StartCoroutine(PostScreenshot());
	}





	// --------------------------------------
	// EVENTS
	// --------------------------------------



	private void OnUserDataLoadFailed() {
		Debug.Log("Opps, user data load failed, something was wrong");
	}


	private void OnUserDataLoaded() {
		IsUserInfoLoaded = true;
	}


	private void OnPost() {
		if (Statics.Reward > 0) {
			Game.Wallet.AddStars(Statics.Reward, 0.5f);
			Statics.ClearPendingSocalPost();
			ObscuredPrefs.SetString("Social_Twitter_PostDate", System.DateTime.Now.ToString("dd-MM-yyyy"));
			StaticFunction.RefreshSocialButtons(true);
		}
	}

	private void OnPostFailed() {
		StaticFunction.RefreshSocialButtons(false);
	}


	private void OnInit() {
		if(SPTwitter.instance.IsAuthed) {
			OnAuth();
		}
	}


	private void OnAuth() {
		IsAuntifivated = true;
		SPTwitter.instance.LoadUserData();
		if (Statics.PendingSocalPost)
        {
			PostHighScore(Statics.Reward);
        }
	}

	// --------------------------------------
	// PRIVATE METHODS
	// --------------------------------------


	private IEnumerator PostScreenshot() {
		
		
		yield return new WaitForEndOfFrame();
		// Create a texture the size of the screen, RGB24 format
		int width = Screen.width;
		int height = Screen.height;
		Texture2D tex = new Texture2D( width, height, TextureFormat.RGB24, false );
		// Read screen contents into the texture
		tex.ReadPixels( new Rect(0, 0, width, height), 0, 0 );
		tex.Apply();
		
		SPTwitter.instance.Post("Twitter message", tex);
		
		Destroy(tex);
		
	}
}
