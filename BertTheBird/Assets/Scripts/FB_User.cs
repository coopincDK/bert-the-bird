using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;
using CodeStage.AntiCheat.ObscuredTypes;

public static class FBUser {
	public static long FacebookID = 0;
	public static string FacebookName = string.Empty;
	public static int FriendCount = 0;
	public static string DebugFriendList = "";
}

public class FB_User : MonoBehaviour {
	public FacebookScript fb;
	bool internetConnection = true; //FIX LATER

	void Awake() {
		LoadUserPlayerPrefs ();

	}

	void Start() {
		if (FBUser.FacebookID != 0) {
			SyncData.HandShake ();
		}
	}


	void LoadUserPlayerPrefs () {
		FBUser.FacebookID = ObscuredPrefs.GetLong ("User_FacebookID");
		FBUser.FacebookName = ObscuredPrefs.GetString ("User_FacebookName");
		FBUser.FriendCount = ObscuredPrefs.GetInt ("User_FriendCount");
	}




}
