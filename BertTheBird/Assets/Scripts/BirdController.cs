using UnityEngine;
using System.Collections;
using CodeStage.AntiCheat.ObscuredTypes;

[System.Serializable]
public class Skin {
	public int ShopID;
	public GameObject GO;
}


public class BirdController : MonoBehaviour {

	//Public
	public static BirdController instance;
	public float diveSpeed = 0.5f;
	public Animator anim;
	public GameSpeed gs;
	public StaticVariables sv;
	public CircleCollider2D DeadBone;
	public Transform SpawnPosition;
    public ScoreBoard ScoreBoard;
	public GameObject PreWormNotification;

	public Skin[] Skins;
	ParticleSystem FeatherBurst;
	float DefaultGravityScale = 0.5f;
	float flappyGravityScale = 4f;

	//powerups
	public ShieldScript PowerUpShield;	
	public MagnetScript PowerUpMagnet;
	public FocusScript PowerUpFocus;

	//Godmode
	public bool GodMode = false;
	float GodModeTime = 0;
	public float GodModeBlinkSpeed = 0.1f;

    
    //Controls
	Rect left = new Rect(0, 0, Screen.width/2, Screen.height);
	Rect right = new Rect(Screen.width/2, 0, Screen.width/2, Screen.height);
    
    //Movement
    float xVel;
	float yVel;


	//bird 
	public Transform CurrentBird;
	int CurrentBirdIndex = -1;
	SpriteRenderer BirdSpriteRender;

	void Awake () {
		instance = this;
		SetBirdSkin ();
		Statics.BirdController = this;
	}

	public void SetBirdSkin() {
		int BirdIndex = ObscuredPrefs.GetInt ("Current_PlayerSkin");

		if (BirdIndex != CurrentBirdIndex) {
			CurrentBirdIndex = BirdIndex;
			foreach (Skin child in Skins) {
				if (CurrentBirdIndex == child.ShopID) {
					child.GO.SetActive(true);
					CurrentBird = child.GO.transform;
				}
				else {
					child.GO.SetActive(false);
				}

			}

			if (CurrentBird == null) {
				CurrentBird = Skins[0].GO.transform;
			}
			CurrentBird.gameObject.SetActive (true);
			BirdSpriteRender = CurrentBird.GetComponent<SpriteRenderer>();
			anim = CurrentBird.GetComponent<Animator> ();
			FeatherBurst = CurrentBird.FindChild ("Particles").GetComponent<ParticleSystem> ();
		}
	}

	void Update () {
		if (Statics.PreWarmMode) {
			GetComponent<Rigidbody2D>().isKinematic = true;
			GetComponent<Rigidbody2D>().velocity = new Vector2(gs.Speed * gs.movespeed, 0);
			transform.rotation = SpawnPosition.rotation;
			transform.position = SpawnPosition.position;
		}
		if (Level.CurrentLevel.GameMode == GameMode.Flappy && !Statics.Dead) {
			if (Input.GetKeyDown (KeyCode.UpArrow) || (Input.GetMouseButtonDown(0))) {
				GetComponent<Rigidbody2D>().velocity = new Vector2 (GetComponent<Rigidbody2D>().velocity.x, 0);
				GetComponent<Rigidbody2D>().AddForce(new Vector2(0, 4000));
			}
		}

		if (GodModeTime > 0) {
			if (!GodMode) {
				GodMode = true;
				ToggleRender();
			}

			GodModeTime -= Time.deltaTime;
			if (GodModeTime <= 0) {
				CancelInvoke("ToggleRender");
				BirdSpriteRender.enabled = true;
				GodModeTime = 0;
				GodMode = false;
			}
		}
	}


	void ToggleRender() {
		BirdSpriteRender.enabled = !BirdSpriteRender.enabled;
		Invoke ("ToggleRender", GodModeBlinkSpeed);
	}



	void FixedUpdate () {
		if (!Statics.Dead && !Statics.PreWarmMode) 
			MoveController ();
		else if (Statics.PreWarmMode && Input.GetMouseButton (0)) 
			EndPreWorm();
	}
	

	void MoveController() {
		//yVel += Physics.gravity.y * rigidbody2D.gravityScale * Time.deltaTime;
		yVel = 0;
		xVel = gs.Speed * gs.movespeed;
		
		
		
		if (Level.CurrentLevel.GameMode == GameMode.Default) {
			if (Input.GetKey (KeyCode.UpArrow) || (Input.GetMouseButton(0) && left.Contains(Input.mousePosition))) {
				
				//yVel = rigidbody2D.velocity.y + diveSpeed;
				yVel += diveSpeed * 300;
			}
			if (Input.GetKey (KeyCode.DownArrow) || (Input.GetMouseButton(0) && right.Contains(Input.mousePosition))) {
				yVel -= diveSpeed * 300;
				//yVel = rigidbody2D.velocity.y - diveSpeed;
			}
			//rigidbody2D.velocity = new Vector2 (xVel, yVel);
			

			GetComponent<Rigidbody2D>().velocity = new Vector2(xVel, GetComponent<Rigidbody2D>().velocity.y);
			GetComponent<Rigidbody2D>().AddForce(new Vector2(0, yVel));
			
		}  else {
			GetComponent<Rigidbody2D>().velocity = new Vector2 (xVel, GetComponent<Rigidbody2D>().velocity.y);
			
		}
		
		
		
		//rigidbody2D.MoveRotation(rigidbody2D.velocity.y * 5f);
		transform.localRotation = Quaternion.Euler (0, 0, GetComponent<Rigidbody2D>().velocity.y * 5f);
	}

	
	void OnTriggerEnter2D(Collider2D other) {
		doCollision (other.gameObject);
	}

	void OnCollisionEnter2D(Collision2D other) {
		doCollision (other.gameObject);
	}

	void doCollision(GameObject other) {
		if (Statics.GameRunning) {
			if (other.tag == "Enemy" && !GodMode) {
				Die ();
			}
			if (other.tag == "Point") {
				sv.IncreaseScore();
				Statics.Sounds.Point.PlayOneShot();
				other.SetActive(false);
			}
			else if (other.tag == "MissedPoint") {
				sv.KillMultiplier();
				other.transform.parent.GetComponent<Animator>().SetBool("Explode", true);
				Statics.Sounds.Explosion.PlayOneShot();
			}

			else if (other.tag == "PowerUp") {
				PowerUpScript pUp = other.GetComponent<PowerUpScript>();
				Statics.PowerUpActive = true;
				pUp.ReadyAt = Time.time + 60f;
	
				pUp.PowerUpEffect.SetActive(true);
				pUp.PowerUpGameObject.SetActive(false);
			}
		}
	}

	public void resetBird() {
		SetBirdSkin ();
		StartPreWorm ();
		gameObject.SetActive(true);
		Statics.Dead = false;
		Statics.Dying = false;
		Statics.PowerUpActive = false;
		if (anim != null)
		anim.SetBool("Dead", false);
		DeadBone.enabled = false;
		GetComponent<Rigidbody2D>().fixedAngle = false;
		if (Level.CurrentLevel.GameMode == GameMode.Flappy) {
			GetComponent<Rigidbody2D>().gravityScale = flappyGravityScale;
		} else {
			GetComponent<Rigidbody2D>().gravityScale = DefaultGravityScale;
		}
		//rigidbody2D.velocity = newVel;

	}

	public void Die() {
		if (Statics.Dead == false) {

			#if UNITY_IPHONE || UNITY_ANDROID
			if (Settings.Game.Vibration) {
				Handheld.Vibrate ();
			}
			#endif
		
			if (PowerUpShield.isActive && PowerUpShield.ShieldsUsed < PowerUpShield.SpawnCount) {
				PowerUpShield.UseShield();
				GodModeTime = 2f;
				return;
			}
		
		
			disableAllPowerups ();
		
			Statics.GameRunning = false;
			Level.EndGame ();
			if (!Statics.Dead) {
				FeatherBurst.Emit(40);
				DeadBone.enabled = true;
				Statics.Dead = true;
				Statics.Dying = true;
				if(anim != null)
				anim.SetBool("Dead", true);
				GetComponent<Rigidbody2D>().gravityScale = 1;
				GetComponent<Rigidbody2D>().fixedAngle = false;
				GetComponent<Rigidbody2D>().AddTorque(Random.Range(-50, -175));
			}
		}
	}

	void disableAllPowerups() {
		PowerUpMagnet.StopPowerUp();
		PowerUpShield.StopPowerUp ();
		PowerUpFocus.StopPowerUp ();
	}

	void StartPreWorm() {
		PreWormNotification.SetActive (true);
		Statics.PreWarmMode = true;
		Level.Control.ChangeMusic (Level.CurrentLevel.Music); 
	}

	void EndPreWorm() {
		PreWormNotification.SetActive (false);
		Statics.PreWarmMode = false;
		GetComponent<Rigidbody2D>().isKinematic = false;
		transform.rotation = SpawnPosition.rotation;
		transform.position = SpawnPosition.position;
	}




}
