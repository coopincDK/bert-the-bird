using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

public class DebugScript : MonoBehaviour {


	//for debugging
	public void ResetPlayerPrefs() {
		PlayerPrefs.DeleteAll ();
		SyncData.Edit.RefreshUI ();
	}

	public void ToggleGodMode() {
		Statics.BirdController.GodMode = !Statics.BirdController.GodMode;
	}

	public void Give(int Amount) {
		Game.Wallet.AddStars (Amount);
	}

	public void Give10000() {
		Game.Wallet.AddStars (10000);
	}

	public void Take10000() {
		Game.Wallet.AddGems (20000);
	}

	public void Give50000() {
		Game.Wallet.AddStars (30000);
	}
	
	public void Take50000() {
		Game.Wallet.AddGems (44000000);
	}

	public void LoginNicolai() {
		SyncData.Sync ();
		FBUser.FacebookID = 683494669;
		FBUser.FacebookName = "Nicolai Mortensen";
		FBUser.DebugFriendList = "1034522005,100002074965376";
		StartCoroutine (ChangeUser ());
	}

	public void LoginMartin() {
		SyncData.Sync ();
		FBUser.FacebookID = 1034522005;
		FBUser.FacebookName = "Martin Mortensen";
		FBUser.DebugFriendList = "683494669,100002074965376";
		StartCoroutine (ChangeUser ());
	}

	public void LoginMark() {
		SyncData.Sync ();
		FBUser.FacebookID = 100002074965376;
		FBUser.FacebookName = "Mark Laursen";
		FBUser.DebugFriendList = "683494669,1034522005";
		StartCoroutine (ChangeUser ());
	}

	public void LoginTestUser1() {
		SyncData.Sync ();
		FBUser.FacebookID = 1111111111;
		FBUser.FacebookName = "Test User #1";
		StartCoroutine (ChangeUser ());
	}

	public void LoginTestUser2() {
		SyncData.Sync ();
		FBUser.FacebookID = 2222222222;
		FBUser.FacebookName = "Test User #2";
		StartCoroutine (ChangeUser ());
	}

	public void LoginTestUser3() {
		SyncData.Sync ();
		FBUser.FacebookID = 3333333333;
		FBUser.FacebookName = "Test User #3";
		StartCoroutine (ChangeUser ());
	}

	IEnumerator ChangeUser() {
		yield return new WaitForSeconds(0.5f);
		SyncData.Edit.AddName ();
		SyncData.TimeStamp = "-1";
		ObscuredPrefs.SetLong ("User_FacebookID", FBUser.FacebookID);
		ObscuredPrefs.SetString ("User_FacebookName", FBUser.FacebookName);
		ObscuredPrefs.SetInt ("Current_PlayerSkin", 0);
		SyncData.HandShake ();
	}
}
