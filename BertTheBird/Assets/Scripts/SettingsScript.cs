using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using CodeStage.AntiCheat.ObscuredTypes;

public class AudioObject {
	public string Name;
	public float DefaultVolume;
	public AudioSource Audio;
}

public static class Settings {
	public static SettingsScript Edit = null;
	public static class Audio {
		public static bool Enabled = true;
		public static float MasterVolume = 1f;
		public static float MusicVolume = 1f;
		public static float SfxVolume = 1f;
	}
	public static class Game {
		public static bool Vibration = true;
	}
	public static class User {
		public static bool FacebookConnected = true;
		public static bool PublicHighScore = true;
	}
}


public class SettingsScript : MonoBehaviour {
	private bool SettingsLoaded = false;
	//Audio Controls
	public NGUIToggle ToggleSound;
	public UISlider MasterVolume;
	public UISlider MusicVolume;
	public UISlider SfxVolume;
	//Audio Vars
	public List<AudioSource> MusicArray;
	List<AudioObject> SoundEffects = new List<AudioObject>();
	List<AudioObject> Musics = new List<AudioObject>();

	//Game Controls
	public NGUIToggle ToggleVibration;

	//User Controls
	public NGUIToggle TogglePublicHighscore;
	//User Vars
	public FacebookScript fb;
	public GameObject infoboxNotConnected;
	public GameObject infoboxConnected;

	void Awake() {
		AudioListener.volume = 0f;
	}

	// Use this for initialization
	void Start () {
		Settings.Edit = this;
		PopulateSoundObjects();
		if (!ObscuredPrefs.GetBool ("Settings_DataExsist")) {
			SetDefaultSettings();
		} else {
			SetSettings();
		}
		SetFacebook (false); //state will be controlled from facebookscript
	}


	void SetDefaultSettings() {
		ObscuredPrefs.SetBool ("Settings_DataExsist", true);
		ObscuredPrefs.SetBool ("Settings_Sound_Enabled", true);
		ObscuredPrefs.SetFloat ("Settings_Sound_MasterVolume", 1f);
		ObscuredPrefs.SetFloat ("Settings_Sound_MusicVolume", 1f);
		ObscuredPrefs.SetFloat ("Settings_Sound_SfxVolume", 1f);
		ObscuredPrefs.SetBool ("Settings_Game_Vibration", true);
		ObscuredPrefs.SetBool ("Settings_User_PublicHighScore", true);
		SetSettings ();
		SettingsLoaded = true;
	}

	void SetSettings(){
		//Sound
		SetToggleSound (ObscuredPrefs.GetBool ("Settings_Sound_Enabled"));
		SetMasterVolume (ObscuredPrefs.GetFloat ("Settings_Sound_MasterVolume"));
		SetMusicVolume (ObscuredPrefs.GetFloat ("Settings_Sound_MusicVolume"));
		SetSfxVolume (ObscuredPrefs.GetFloat ("Settings_Sound_SfxVolume"));

		//Game
		SetVibration (ObscuredPrefs.GetBool ("Settings_Game_Vibration"));

		//done
		SettingsLoaded = true;
	}

	//
	// SoundSettings
	//
	public void UpdateToggleSound() {
		bool Enabled = !ObscuredPrefs.GetBool ("Settings_Sound_Enabled");
		ObscuredPrefs.SetBool ("Settings_Sound_Enabled", Enabled);
		SetToggleSound (Enabled);
	}

	void SetToggleSound(bool Enabled) {
		if (Enabled) {
			AudioListener.volume = 1f * ObscuredPrefs.GetFloat ("Settings_Sound_MasterVolume");
		} 
		else {
			AudioListener.volume = 0;
		}

		if (!SettingsLoaded)
			ToggleSound.SetOn(Enabled);
		
	}

	public void UpdateMasterVolume() {
		ObscuredPrefs.SetFloat ("Settings_Sound_MasterVolume", MasterVolume.value);
		SetMasterVolume (MasterVolume.value);
	}

	void SetMasterVolume(float value) {
		float newValue = 1f * value;
		if (ObscuredPrefs.GetBool ("Settings_Sound_Enabled")) {
			AudioListener.volume = newValue;
		}
		if (!SettingsLoaded)
			MasterVolume.value = newValue;
	}

	public void UpdateMusicVolume() {
		ObscuredPrefs.SetFloat ("Settings_Sound_MusicVolume", MusicVolume.value);
		SetMusicVolume (MusicVolume.value);
	}
	
	void SetMusicVolume(float value) {
		foreach (AudioObject a in Musics) {
			a.Audio.volume = a.DefaultVolume * value;
		}
		if (!SettingsLoaded)
			MusicVolume.value = value;
	}

	public void UpdateSfxVolume() {
		ObscuredPrefs.SetFloat ("Settings_Sound_SfxVolume", SfxVolume.value);
		SetSfxVolume (SfxVolume.value);
	}
	
	void SetSfxVolume(float value) {
		List<AudioObject> DeleteList = new List<AudioObject> ();
		foreach (AudioObject a in SoundEffects) {
			if (a.Audio != null) {
				a.Audio.volume = a.DefaultVolume * value;
			} else {
				//Audiosource was destroyed on load. removing from list (can occur if prefrabs is rested in other prefabs)
				DeleteList.Add(a);
			}
		}

		if (DeleteList.Count > 0) {
			DeleteList.ForEach(a => {
				SoundEffects.Remove(a);
			});
		}

		DeleteList.Clear ();

		if (!SettingsLoaded)
			SfxVolume.value = value;
	}

	void PopulateSoundObjects () {
		AudioSource[] AudioSources = Resources.FindObjectsOfTypeAll<AudioSource>();
		foreach (AudioSource a in AudioSources) {

			if (MusicArray.Contains(a)) {
				Musics.Add(new AudioObject(){ DefaultVolume = a.volume, Audio = a, Name = a.transform.name });
			}
			else {
				SoundEffects.Add(new AudioObject(){ DefaultVolume = a.volume, Audio = a, Name = a.transform.name });
			}
		}
	}

	//
	// Game Settings
	//
	public void UpdateVibration() {
		bool Enabled = !ObscuredPrefs.GetBool ("Settings_Game_Vibration");
		ObscuredPrefs.SetBool ("Settings_Game_Vibration", Enabled);
		SetVibration (Enabled);
	}
	
	void SetVibration(bool Enabled) {
		Settings.Game.Vibration = Enabled;

		if (!SettingsLoaded)
			ToggleVibration.SetOn(Enabled);
	}

	//
	// User Settings
	//
	public void UpdateFacebook() {
		if (fb.IsAuntifivated) 
			fb.LogOut();
		else
			fb.LogIn();
		//SetFacebook (xxx); (done in FacebookScript).
	}
	
	public void SetFacebook(bool Enabled) {
		Settings.User.FacebookConnected = Enabled;
	}
	

	public void SetInfobox() {
		if (fb.IsUserInfoLoaded) {
			NGUITools.SetActive(infoboxConnected, true);
			NGUITools.SetActive(infoboxNotConnected, false);
		} 
		else {
			NGUITools.SetActive(infoboxConnected, false);
			NGUITools.SetActive(infoboxNotConnected, true);
		} 

	}
}	
