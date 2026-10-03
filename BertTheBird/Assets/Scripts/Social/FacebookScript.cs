////////////////////////////////////////////////////////////////////////////////
//  
// @module Mobile Social Plugin 
// @author Osipov Stanislav (Stan's Assets) 
// @support stans.assets@gmail.com 
//
////////////////////////////////////////////////////////////////////////////////


using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using CodeStage.AntiCheat.ObscuredTypes;


public class FacebookScript : MonoBehaviour {

	[HideInInspector]
	public bool IsUserInfoLoaded = false;
	[HideInInspector]
	public bool IsFrindsInfoLoaded = false;
	[HideInInspector]
	public bool IsAuntifivated = false;
	[HideInInspector]
	public bool IsFrindsIdsLoaded = false;
	public FB_User FBUserScript;
	public LeaderBoard Leaderboard;







	void Awake() {


		SPFacebook.instance.addEventListener(FacebookEvents.FACEBOOK_INITED, 			 OnInit);
		SPFacebook.instance.addEventListener(FacebookEvents.AUTHENTICATION_SUCCEEDED,  	 OnAuth);
		SPFacebook.instance.addEventListener(FacebookEvents.AUTHENTICATION_FAILED,  	 OnAuthFailed);
		

		SPFacebook.instance.addEventListener(FacebookEvents.USER_DATA_LOADED,  			OnUserDataLoaded);
		SPFacebook.instance.addEventListener(FacebookEvents.USER_DATA_FAILED_TO_LOAD,   OnUserDataLoadFailed);

		SPFacebook.instance.addEventListener(FacebookEvents.FRIENDS_DATA_LOADED,  			OnFriendsDataLoaded);
		SPFacebook.instance.addEventListener(FacebookEvents.FRIENDS_FAILED_TO_LOAD,   		OnFriendDataLoadFailed);

		//SPFacebook.instance.addEventListener(FacebookEvents.FRIENDIDS_LOADED,  			OnFriendIdsLoaded);
		//SPFacebook.instance.addEventListener(FacebookEvents.FRIENDIDS_FAILED_TO_LOAD,   		OnFriendIdsLoadFailed);

		SPFacebook.instance.addEventListener(FacebookEvents.POST_FAILED,  			OnPostFailed);
		SPFacebook.instance.addEventListener(FacebookEvents.POST_SUCCEEDED,   		OnPost);


		SPFacebook.instance.addEventListener(FacebookEvents.GAME_FOCUS_CHANGED,   OnFocusChanged);

		SPFacebook.instance.Init();

		//statusMessage = "initializing Facebook";

	}

	public void LogIn() {
		SPFacebook.instance.Login("email,publish_actions");
	}

	public void LogInWithReward() {
		Statics.Reward = 1000;
		SPFacebook.instance.Login("email,publish_actions");
	}

	public void LogOut() {
		IsUserInfoLoaded = false;
		IsAuntifivated = false;
		SPFacebook.instance.Logout();
		Settings.Edit.SetFacebook (false);
		Settings.Edit.SetInfobox ();
	}
	
	public void PostHighScore (ObscuredInt reward) {
		Statics.Reward = reward;
		if (!IsAuntifivated) {
			Statics.PendingSocalPost = true;
			LogIn();
			return;
		}
		
		PostMessage();
	}

	
//	void OnGUI() {
//
//		GUI.Label(new Rect(10, Screen.height - 40, Screen.width, 40), statusMessage, statusStyle);
//		
//		if(!IsAuntifivated) {
//			GUI.Label(new Rect(10, 10, Screen.width, 100), "App do not have permission to use your facebook account, press the button to auntificate", style);
//			if(GUI.Button(new Rect(10, 70, 150, 50), "Facebook Auth")) {
//				SPFacebook.instance.Login("email,publish_actions");
//				statusMessage = "Log in...";
//			}
//		} else {
//			
//			if(!IsUserInfoLoaded) {
//				GUI.Label(new Rect(10, 10, Screen.width, 100), "Great, app have  permission to use your facebook account, see the avaliable action bellow", style);
//				
//				if(GUI.Button(new Rect(10, 70, 150, 50), "Load User Data")) {
//					SPFacebook.instance.LoadUserData();
//					statusMessage = "Loadin user data..";
//				}
//				
//				if(GUI.Button(new Rect(10, 130, 150, 50), "Post Message")) {
//					SPFacebook.instance.Post (
//						link: "http://unity3d.com/",
//						linkName: "The Larch",
//						linkCaption: "I thought up a witty tagline about larches",
//						linkDescription: "There are a lot of larch trees around here, aren't there?",
//						picture: "http://unity3d.com/sites/default/files/frontpage/learn.jpg"
//						);
//
//					statusMessage = "Positng..";
//				}
//				
//				if(GUI.Button(new Rect(10, 190, 150, 50), "Post ScreehShot")) {
//					StartCoroutine(PostScreenshot());
//					statusMessage = "Positng..";
//				}
//				
//				if(GUI.Button(new Rect(10, 250, 150, 50), "Log out")) {
//					LogOut();
//					statusMessage = "Logged out";
//				}
//			} else {
//				
//				if(SPFacebook.instance.userInfo.GetProfileImage(FacebookProfileImageSize.large) != null) {
//					Texture2D img = SPFacebook.instance.userInfo.GetProfileImage(FacebookProfileImageSize.large);
//					GUI.DrawTexture(new Rect(10, 10, img.width, img.height),  img);
//				}
//				
//				
//
//				
//				GUI.Label(new Rect(240, 10, Screen.width, 100),  SPFacebook.instance.userInfo.name + " aka " + SPFacebook.instance.userInfo.username, style2);
//				GUI.Label(new Rect(240, 30, Screen.width, 100),  "Location:  " + SPFacebook.instance.userInfo.location, style2);
//				GUI.Label(new Rect(240, 50, Screen.width, 100),  "Language:  " + SPFacebook.instance.userInfo.locale, style2);
//				
//				GUI.Label(new Rect(240, 70, Screen.width, 100),  "e-mail:  " + SPFacebook.instance.userInfo.email , style2);
//
//
//				float x = 260;
//				float y = 110;


//				if(IsFrindsInfoLoaded) {
//					foreach(FacebookUserInfo friend in SPFacebook.instance.firendsList) {
				
//						if(friend.GetProfileImage(FacebookProfileImageSize.square) != null) {
//							Texture2D img = friend.GetProfileImage(FacebookProfileImageSize.square);
//							GUI.DrawTexture(new Rect(x, y, img.width, img.height),  img);

//							GUI.Label(new Rect(x - 15, y + 80, Screen.width, 100),  friend.first_name , style2);
//						} 

//						x+= 100;
//					}
//				}
				
	
//				if(GUI.Button(new Rect(10, 300, 150, 50), "Post Message")) {
//					SPFacebook.instance.Post (
//						link: "http://unity3d.com/",
//						linkName: "The Larch",
//						linkCaption: "I thought up a witty tagline about larches",
//						linkDescription: "There are a lot of larch trees around here, aren't there?",
//						picture: "http://unity3d.com/sites/default/files/frontpage/learn.jpg"
//						);
//					
//					statusMessage = "Positng..";
//				}


				
//				if(GUI.Button(new Rect(10, 360, 150, 50), "Post ScreehShot")) {
//					StartCoroutine(PostScreenshot());
//					statusMessage = "Positng..";
//				}

//				if(GUI.Button(new Rect(10, 420, 150, 50), "LoadFriends")) {
//					SPFacebook.instance.LoadFrientdsInfo(5);
//					statusMessage = "Loading friends..";
//				}
//				
//				if(GUI.Button(new Rect(10, 480, 150, 50), "Log out")) {
//					LogOut();
//					statusMessage = "Logged out";
//				}
//			}
//		}
//	}


	// --------------------------------------
	// EVENTS
	// --------------------------------------
	

	private void OnFocusChanged(CEvent e) {
		bool focus = (bool) e.data;

		if (!focus)  {                                                                                        
			// pause the game - we will need to hide                                             
			Time.timeScale = 0;                                                                  
		} else  {                                                                                        
			// start the game back up - we're getting focus again                                
			Time.timeScale = 1;                                                                  
		}   
	}


	private void OnUserDataLoadFailed() {
		Debug.Log("Opps, user data load failed, something was wrong");
	}
	
	
	private void OnUserDataLoaded() {
		//"User data loaded";
		IsUserInfoLoaded = true;
		Settings.Edit.SetInfobox ();
		SPFacebook.instance.LoadFrientdsInfo (2000);
	}

	private void OnFriendDataLoadFailed() {
		//"Opps, friends data load failed, something was wrong";
		Debug.Log("Opps, friends data load failed, something was wrong");
	}

	private void OnFriendsDataLoaded() {
		//"Friends data loaded";
		//foreach(FacebookUserInfo friend in SPFacebook.instance.friendsList) {
		//	friend.LoadProfileImage(FacebookProfileImageSize.square);
		//}

		IsFrindsInfoLoaded = true;
	}

	private void OnFriendIdsLoadFailed() {
		//"Opps, friends data load failed, something was wrong";
		Debug.Log("Opps, friend id data load failed, something was wrong");
	}
	
	private void OnFriendIdsLoaded() {
		IsFrindsIdsLoaded = true;

		string fullName = SPFacebook.instance.userInfo.name;
		int friendCount = SPFacebook.instance.friendsIds.Count;
		
		if (fullName != FBUser.FacebookName) {
			ObscuredPrefs.SetString ("User_FacebookName", fullName);
			FBUser.FacebookName = fullName;
			SyncData.Edit.AddName();
		}
		
		if (friendCount != FBUser.FriendCount) {
			ObscuredPrefs.SetInt ("User_FriendCount", friendCount);
			FBUser.FriendCount = friendCount;
			SyncData.Edit.AddFriendList();
		}

		//If new user
		if (FBUser.FacebookID == 0) {
			System.Int64 ID = System.Convert.ToInt64(SPFacebook.instance.userInfo.id);
			FBUser.FacebookID = ID;
			ObscuredPrefs.SetLong ("User_FacebookID", ID);


			if (Statics.Reward > 0) {
				Game.Wallet.AddStars(Statics.Reward);
				Statics.Reward = 0;
				if (NGUITools.GetActive(Leaderboard.gameObject)) {
					Leaderboard.LoadDefault();
				}
			}



			SyncData.HandShake();
		}
	}
	

	
	
	private void OnInit() {

		if(SPFacebook.instance.IsLoggedIn) {
			OnAuth();
		} 
	}
	
	
	private void OnAuth() {
		IsAuntifivated = true;
		Settings.Edit.SetFacebook (true);
		SPFacebook.instance.LoadUserData();

		if (Statics.PendingSocalPost)
		{
			PostHighScore(Statics.Reward);
		}
	}

	private void OnAuthFailed(CEvent e) {
		FBResult result = e.data as FBResult;
		Settings.Edit.SetFacebook (false);

	}

	private void OnPost(CEvent e) {
		FBResult result = e.data as FBResult; //To check if result contanis an ID

		if (Statics.Reward > 0 && result.Text.Contains("\"id\"")) {
			Game.Wallet.AddStars(Statics.Reward, 0.5f);
			Statics.ClearPendingSocalPost();
			ObscuredPrefs.SetString("Social_Facebook_PostDate", System.DateTime.Now.ToString("dd-MM-yyyy"));
			StaticFunction.RefreshSocialButtons(true);
		} else {
			StaticFunction.RefreshSocialButtons(false);
		}
	}
	
	private void OnPostFailed() {
		//Error popup
		StaticFunction.RefreshSocialButtons(false);
	}
	


	
	// --------------------------------------
	// Public vars
	// --------------------------------------

	//public List<FacebookUserInfo> Friends() {
	//	return SPFacebook.instance.firendsList;
	//}

	//				if(IsFrindsInfoLoaded) {
	//					foreach(FacebookUserInfo friend in SPFacebook.instance.firendsList) {
	
	//						if(friend.GetProfileImage(FacebookProfileImageSize.square) != null) {
	//							Texture2D img = friend.GetProfileImage(FacebookProfileImageSize.square);
	//							GUI.DrawTexture(new Rect(x, y, img.width, img.height),  img);
	
	//							GUI.Label(new Rect(x - 15, y + 80, Screen.width, 100),  friend.first_name , style2);
	//						} 
	
	//						x+= 100;
	//					}
	//				}

	// --------------------------------------
	// PRIVATE METHODS
	// --------------------------------------

	private void PostMessage() {
		if (Statics.ShowingScoreBoard) {
			SPFacebook.instance.Post (
				link: "http://www.BertTheBird.com/",
				linkName: "I've got " + Format.Number(Level.CurrentLevel.HighScore.Score) + " Stars, a X" + Level.CurrentLevel.HighScore.Streak.ToString() + " Streak, and my best time is " + Format.Time(Level.CurrentLevel.HighScore.Time, false) + " in Bert The Bird's \"" + Level.CurrentLevel.Name + "\" level. I bet you can't beat that!",
				linkCaption: "www.BertTheBird.com",
				linkDescription: "Bert The Bird - All you need to make time \"Fly\".",
				picture: "http://www.bertthebird.com/icon.png"
				);		
		} 
		else {
			SPFacebook.instance.Post (
				link: "http://www.BertTheBird.com/",
				linkName: "You really need to try this game!",
				linkCaption: "www.BertTheBird.com",
				linkDescription: "Bert The Bird - All you need to make time \"Fly\". With Facebook Leaderboards so you'll be able to compete with you friends, or the rest of the world (if you're that good). Lets make it a Challenge!",
				picture: "http://www.bertthebird.com/icon.png"
				);
		}
	}


	private IEnumerator PostScreenshot() {
		
		
		yield return new WaitForEndOfFrame();
		// Create a texture the size of the screen, RGB24 format
		int width = Screen.width;
		int height = Screen.height;
		Texture2D tex = new Texture2D( width, height, TextureFormat.RGB24, false );
		// Read screen contents into the texture
		tex.ReadPixels( new Rect(0, 0, width, height), 0, 0 );
		tex.Apply();

		SPFacebook.instance.PostImage("My app ScreehShot", tex);;
		
		Destroy(tex);
		
	}
	




}
