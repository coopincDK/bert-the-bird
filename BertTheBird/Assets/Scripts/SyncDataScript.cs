using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using Kernys.Bson;
using CodeStage.AntiCheat.ObscuredTypes;

public static class SyncData {
	public static bool PendingData = false;
	public static bool UpdateFacebookName = false;
	public static bool UpdateFriendList = false;
	public static ObscuredString TimeStamp = "0";
	public static ObscuredInt Currency;
	public static ObscuredInt PremiumCurrency;
	public static List<string> Achievements = new List<string>();
	public static List<string> ItemsBourght = new List<string>();
	public static List<string> ItemsUsed = new List<string>();
	public static List<string> HighScores = new List<string>();
	public static List<string> Levels = new List<string>();
	public static SyncDataScript Edit = null;
	public static void Sync() {
		if (Edit != null)
		Edit.Sync ();
	}
	public static void HandShake() {
		if (Edit != null)
		Edit.Handshake ();
	}
	public static void LogCheat(string message) {
		Edit.LogCheat (message);
	}
}


public class SyncDataScript : MonoBehaviour {
	public FacebookScript fb;

	//
	// Instanciation
	//

	void Awake () {
		LoadPrefabData ();
		SyncData.Edit = this;
	}

	void LoadPrefabData () {
		SyncData.PendingData = ObscuredPrefs.GetBool ("SyncData_PendingData");
		SyncData.UpdateFacebookName = ObscuredPrefs.GetBool ("SyncData_UpdateFacebookName");
		SyncData.UpdateFriendList = ObscuredPrefs.GetBool ("SyncData_UpdateFriendList");
		string TimeStamp = ObscuredPrefs.GetString ("SyncData_TimeStamp");
		SyncData.TimeStamp = string.IsNullOrEmpty (TimeStamp.Trim()) ? "0" : TimeStamp;
		SyncData.Currency = ObscuredPrefs.GetInt ("SyncData_Currency");
		SyncData.PremiumCurrency = ObscuredPrefs.GetInt ("SyncData_PremiumCurrency");
		SyncData.Achievements.AddRange((string[])ObscuredPrefs.GetString ("SyncData_Achievements").Split (','));
		SyncData.ItemsBourght.AddRange((string[])ObscuredPrefs.GetString ("SyncData_ItemsBourght").Split (','));
		SyncData.ItemsUsed.AddRange((string[])ObscuredPrefs.GetString ("SyncData_ItemsUsed").Split (','));
		SyncData.HighScores.AddRange((string[])ObscuredPrefs.GetString ("SyncData_HighScores").Split (','));
		SyncData.Levels.AddRange((string[])ObscuredPrefs.GetString ("SyncData_Levels").Split (','));
	}

	//
	//  Syncdata Interactions
	//

	public void AddName() {
		SyncData.UpdateFacebookName = true;
		ObscuredPrefs.SetBool ("SyncData_UpdateFacebookName", true);
		SetPendingData();
	}

	public void AddFriendList() {
		SyncData.UpdateFriendList = true;
		ObscuredPrefs.SetBool ("SyncData_UpdateFriendList", true);
		SetPendingData();
	}

	void ClearName() {
		SyncData.UpdateFacebookName = false;
		ObscuredPrefs.SetBool ("SyncData_UpdateFacebookName", false);
	}
	
	void ClearFriendList() {
		SyncData.UpdateFriendList = false;
		ObscuredPrefs.SetBool ("SyncData_UpdateFriendList", false);
	}


	public void AddCurrency(ObscuredInt change) {
		SyncData.Currency += change;
		ObscuredPrefs.SetInt ("SyncData_Currency", SyncData.Currency);
		SetPendingData();
	}

	public void AddPremiumCurrency(ObscuredInt change) {
		SyncData.PremiumCurrency += change;
		ObscuredPrefs.SetInt ("SyncData_PremiumCurrency", SyncData.PremiumCurrency);
		SetPendingData();
	}

	public void AddAchievement(ObscuredInt ID) {
		SyncData.Achievements.Add (ID.ToString ());
		ObscuredString prefValue = string.Join(",", SyncData.Achievements.ToArray ());
		ObscuredPrefs.SetString ("SyncData_Achievements", prefValue);
		SetPendingData();
	}

	public void AddItemBourght(ObscuredInt ID) {
		SyncData.ItemsBourght.Add (ID.ToString ());
		ObscuredString prefValue = string.Join(",", SyncData.ItemsBourght.ToArray ());
		ObscuredPrefs.SetString ("SyncData_ItemsBourght", prefValue);
		SetPendingData();
	}

	public void AddItemUsed(ObscuredInt ID) {
		SyncData.ItemsUsed.Add (ID.ToString ());
		ObscuredString prefValue = string.Join(",", SyncData.ItemsUsed.ToArray ());
		ObscuredPrefs.SetString ("SyncData_ItemsUsed", prefValue);
		SetPendingData();
	}

	public void AddHighScore(ObscuredInt ID) {
		if (!SyncData.HighScores.Contains(ID.ToString())) {
			SyncData.HighScores.Add (ID.ToString ());
			ObscuredString prefValue = string.Join(",", SyncData.HighScores.ToArray ());
			ObscuredPrefs.SetString ("SyncData_HighScores", prefValue);
			SetPendingData();
		}
	}

	public void AddLevels(ObscuredInt ID) {
		if (!SyncData.Levels.Contains(ID.ToString())) {
			SyncData.Levels.Add (ID.ToString ());
			ObscuredString prefValue = string.Join(",", SyncData.Levels.ToArray ());
			ObscuredPrefs.SetString ("SyncData_Levels", prefValue);
			SetPendingData();
		}
	}

	void SetPendingData() {
		SyncData.PendingData = true;
		ObscuredPrefs.SetBool ("SyncData_PendingData", true);
	}

	public void SetTimeStamp(string timestamp) {
		ObscuredPrefs.SetString ("SyncData_TimeStamp", timestamp);
		SyncData.TimeStamp = timestamp;
	}

	public void ClearSyncData() {
		ObscuredPrefs.SetInt ("SyncData_Currency", 0);
		ObscuredPrefs.SetInt ("SyncData_PremiumCurrency", 0);
		ObscuredPrefs.SetString ("SyncData_Achievements", "");
		ObscuredPrefs.SetString ("SyncData_ItemsBourght", "");
		ObscuredPrefs.SetString ("SyncData_ItemsUsed", "");
		ObscuredPrefs.SetString ("SyncData_HighScores", "");
		ObscuredPrefs.SetString ("SyncData_Levels", "");
		ObscuredPrefs.SetBool ("SyncData_PendingData", false);

		SyncData.Currency = 0;
		SyncData.PremiumCurrency = 0;
		SyncData.Achievements.Clear ();
		SyncData.ItemsBourght.Clear ();
		SyncData.ItemsUsed.Clear ();
		SyncData.HighScores.Clear ();
		SyncData.Levels.Clear ();
		SyncData.PendingData = false;
	}



	//
	// Prossesed Post Data
	//

	string GetHighScoreSyncData() {
		string result = string.Empty;
		if (SyncData.HighScores.Count > 0) {
			bool first = true;
			foreach (String sid in SyncData.HighScores) {
				if (!String.IsNullOrEmpty(sid)) {
					HighScore Score = Level.GetHighScore(Convert.ToInt32(sid));
					if (!first)
						result += ",";
					first = false;
					result += sid + ":";
					result += Score.Score.ToString() + ":";
					result += Score.Streak.ToString() + ":";
					result += Score.Time.ToString() + ":";
					result += Score.Today + ":";
					result += Score.Today_Score.ToString() + ":";
					result += Score.Today_Streak.ToString() + ":";
					result += Score.Today_Time.ToString();
				}
			}
		}
		return result;
	}

	string GetLevelSyncData() {
		string result = string.Empty;
		if (SyncData.Levels.Count > 0) {
			bool first = true;
			foreach (string id in SyncData.Levels) {
				if (!String.IsNullOrEmpty(id)) {
					if (!first)
						result += ",";
					first = false;

					result += id + ":";
					result += ObscuredPrefs.GetBool("Level_" + id + "_Unlocked").ToString() + ":";
					result += ObscuredPrefs.GetBool("Level_" + id + "_Completed").ToString() + ":";
					result += ObscuredPrefs.GetInt("Level_" + id + "_Rating");
				}
			}
		}
		return result;
	}

	string GetFriendList() {
		string Friends = string.Empty;
		if (fb.IsFrindsIdsLoaded) {
			bool first = true;
			foreach (string id in SPFacebook.instance.friendsIds) {
				if (first) {
					Friends = id;
				} else {
					Friends += ","+id;
				}
				first = false;
			}
		}
		return Friends;
	}

	//
	// WebPosts
	//


	public void Handshake() {
		StartCoroutine(PostSyncData (true));
	}

	public void Sync() {
		StartCoroutine(PostSyncData (false));
	}

	void startPost(byte[] data) {

	}

	public IEnumerator PostSyncData(bool ForcePost) {
		if (FBUser.FacebookID != 0 && (SyncData.PendingData || ForcePost)) {

			int SyncData_Currency = ObscuredPrefs.GetInt ("SyncData_Currency");
			int SyncData_PremiumCurrency = ObscuredPrefs.GetInt ("SyncData_PremiumCurrency");
			string SyncData_Achievements = ObscuredPrefs.GetString ("SyncData_Achievements");
			string SyncData_ItemsBourght = ObscuredPrefs.GetString ("SyncData_ItemsBourght");
			string SyncData_ItemsUsed = ObscuredPrefs.GetString ("SyncData_ItemsUsed");
			string SyncData_HighScores = GetHighScoreSyncData();
			string SyncData_Levels = GetLevelSyncData();
			bool Sync_Currency = SyncData_Currency != 0;
			bool Sync_PremiumCurrency = SyncData_PremiumCurrency != 0;
			bool Sync_Achievements = SyncData_Achievements.Length > 0;
			bool Sync_ItemsBourght = SyncData_ItemsBourght.Length > 0;
			bool Sync_ItemsUsed = SyncData_ItemsUsed.Length > 0;
			bool Sync_HighScores = SyncData_HighScores.Length > 0;
			bool Sync_Levels = SyncData_Levels.Length > 0;
			bool Sync_SyncData = Sync_Currency || Sync_PremiumCurrency || Sync_Achievements || Sync_ItemsBourght || Sync_ItemsUsed || Sync_HighScores || Sync_Levels;
			
			var obj = new BSONObject ();
			obj["method"] = "sync";
			obj["UserID"] = FBUser.FacebookID.ToString();
			obj["GameID"] = Game.Id;
			obj["TimeStamp"] = (string)SyncData.TimeStamp;

			if (SyncData.UpdateFacebookName || SyncData.UpdateFriendList) {
				Debug.Log("INCLUDING USERDATA" + SyncData.UpdateFriendList.ToString());
				obj["User"] = new BSONObject();
				if (SyncData.UpdateFacebookName)
					obj["User"]["FacebookName"] = FBUser.FacebookName;
				if (SyncData.UpdateFriendList && fb.IsFrindsIdsLoaded)
					obj["User"]["FriendList"] = GetFriendList();
				if (FBUser.DebugFriendList.Length > 0)                           ///
					obj["User"]["FriendList"] = FBUser.DebugFriendList;          /// REMOVE BEFORE LIVE!!!!!
			}
			
			
			if (Sync_SyncData) {
				obj["SyncData"] = new BSONObject();
				if (Sync_Currency)
					obj["SyncData"]["Currency"] = SyncData_Currency;
				if (Sync_PremiumCurrency) 
					obj["SyncData"]["PremiumCurrency"] = SyncData_PremiumCurrency;
				if (Sync_Achievements)
					obj["SyncData"]["Achievements"] = SyncData_Achievements;
				if (Sync_ItemsBourght)
					obj["SyncData"]["ItemsBourght"] = SyncData_ItemsBourght;
				if (Sync_ItemsUsed)
					obj["SyncData"]["ItemsUsed"] = SyncData_ItemsUsed;
				if (Sync_HighScores)
					obj["SyncData"]["HighScores"] = SyncData_HighScores;
				if (Sync_Levels)
					obj["SyncData"]["Levels"] = SyncData_Levels;
			}
			byte[] bson = SimpleBSON.Dump(obj);


			Debug.Log ("Posting Data");

			AES AES = new AES (false, false);
			WWW response = new WWW (Game.postUrl, AES.write(bson));
			
			yield return response;
			if (!string.IsNullOrEmpty(response.error)) {
				Debug.Log("Error sending data");
			} 
			else {
				Debug.Log("bytes: "  + response.bytes.Length);
				BSONObject response_obj = SimpleBSON.Load(AES.read(response.bytes));
				
				if (response_obj.ContainsKey("Success")) {
					if (response_obj.ContainsKey("TimeStamp")) 
						SetTimeStamp(response_obj["TimeStamp"].stringValue);
					if (response_obj.ContainsKey("DataSynced"))
						ClearSyncData();
					if (response_obj.ContainsKey("NameUpdated"))
					    ClearName();
					if (response_obj.ContainsKey("FriendListUpdated"))
					    ClearFriendList();
					if (response_obj.ContainsKey("LoadData")) 
						Load ((BSONObject)response_obj["LoadData"]);
				}
			}
		}
	}
	
	
	public void LogCheat(string message) {
		if (FBUser.FacebookID != 0) {
			var obj = new BSONObject ();
			obj["method"] = "cheat";
			obj["UserID"] = FBUser.FacebookID.ToString();
			obj["GameID"] = Game.Id.ToString();
			obj["TimeStamp"] = (string)SyncData.TimeStamp;
			obj["Cheat"] = new BSONObject();
			obj["Cheat"]["Message"] = message;
			byte[] bson = SimpleBSON.Dump(obj);

			AES AES = new AES (false, false);
			WWW response = new WWW (Game.postUrl, AES.write(bson));
		}
	}




	//
	// Loads recived data. Reset if nessecery (level data etc).
	//

	public void Load(BSONObject obj) {

		
		//Load Settings
		if (obj.ContainsKey("Settings")) {
			//Load
			ObscuredPrefs.SetBool ("Settings_User_PublicHighScore", bool.Parse(obj["Settings"]["PublicHighScore"].stringValue));
		}
		
		//Load Wallet
		if (obj.ContainsKey("Wallet")) {
			//Load
			ObscuredPrefs.SetInt ("Wallet_Stars", obj["Wallet"]["RegularCurrency"].int32Value);
			ObscuredPrefs.SetInt ("Wallet_Gems", obj["Wallet"]["PremiumCurrency"].int32Value);
		}
		
		//Load Levels
		if (obj.ContainsKey("Levels")) {
			//reset
			foreach (LevelObject level in Level.Control.Levels) {
				string id = level.ID.ToString();
				ObscuredPrefs.SetBool("Level_" + id + "_Unlocked", false);
				ObscuredPrefs.SetBool("Level_" + id + "_Completed", false);
				ObscuredPrefs.SetInt("Level_" + id + "_Rating", 0);
			}
			
			//load
			foreach (BSONObject level_obj in (BSONArray)obj["Levels"]) {
				string id = level_obj["ID"].stringValue;
				ObscuredPrefs.SetBool("Level_" + id + "_Unlocked", bool.Parse(level_obj["Unlocked"].stringValue));
				ObscuredPrefs.SetBool("Level_" + id + "_Completed", bool.Parse(level_obj["Completed"].stringValue));
				ObscuredPrefs.SetInt("Level_" + id + "_Rating", level_obj["Rating"].int32Value);
			}
		}
		
		//Load Achievements
		if (obj.ContainsKey("Achievements")) {
			//reset
			//TODO: når jeg har lavet et Achivement system.
			
			//load
			foreach (BSONObject achievement_obj in (BSONArray)obj["Achievements"]) {
				string id = achievement_obj["ID"].stringValue;
				ObscuredPrefs.SetBool("Achievement_" + id + "_Unlocked", bool.Parse(achievement_obj["Unlocked"].stringValue));
			}
		}
		
		//Load Items
		if (obj.ContainsKey("Items")) {
			//reset
			foreach (ShopItemScript item in Resources.FindObjectsOfTypeAll<ShopItemScript>()) {
				ObscuredPrefs.SetBool("Item_" + item.ID + "_Unlocked", false);
				ObscuredPrefs.SetInt("Item_" + item.ID + "_Count", 0);
			}
			
			//load
			foreach (BSONObject item_obj in (BSONArray)obj["Items"]) {
				string id = item_obj["ID"].stringValue;
				ObscuredPrefs.SetBool("Item_" + id + "_Unlocked", bool.Parse(item_obj["Unlocked"].stringValue));
				ObscuredPrefs.SetInt("Item_" + id + "_Count", item_obj["Count"].int32Value);
			}
		}
		//Load HighScores
		if (obj.ContainsKey("HighScores")) {
			//reset
			foreach (LevelObject level in Level.Control.Levels) {
				string LevelID = level.ID.ToString();
				ObscuredPrefs.SetInt ("HighScore_Score_Level_" + LevelID, 0);
				ObscuredPrefs.SetInt ("HighScore_Streak_Level_" + LevelID, 0);
				ObscuredPrefs.SetFloat ("HighScore_Time_Level_" + LevelID, 0);
			}
			
			//load
			foreach (BSONObject highscore_obj in (BSONArray)obj["HighScores"]) {
				string LevelID = highscore_obj["LevelID"].stringValue;
				ObscuredPrefs.SetInt ("HighScore_Score_Level_" + LevelID, highscore_obj["Score"].int32Value);
				ObscuredPrefs.SetInt ("HighScore_Streak_Level_" + LevelID, highscore_obj["Streak"].int32Value);
				ObscuredPrefs.SetFloat ("HighScore_Time_Level_" + LevelID, (float)highscore_obj["Time"].doubleValue);
			}
		}
		
		
		Debug.Log("Done Loading Data, reloading level");
		RefreshUI ();
	}

	public void RefreshUI() {
		
		Game.Wallet.Refresh ();
		foreach (LoadLevel level in Resources.FindObjectsOfTypeAll<LoadLevel>()) {
			level.Refresh();
		}
		foreach (ShopItemScript item in Resources.FindObjectsOfTypeAll<ShopItemScript>()) {
			item.Refresh();
		}
		
		
		
		//TODO: Items, Achivemens, Settings
	}



}
