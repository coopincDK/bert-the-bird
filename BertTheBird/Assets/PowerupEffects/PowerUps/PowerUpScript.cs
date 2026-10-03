using UnityEngine;
using System.Collections;

public class PowerUpScript : MonoBehaviour {
	[SerializeField]
	public PowerUpType Type;
	public float ReadyAt = 0f;
	public float SpawnMin = 15f;
	public float SpawnMax = 25f;

	[HideInInspector]
	public GameObject PowerUpGameObject;
	public GameObject PowerUpEffect;

	void Start() {
		PowerUpGameObject = transform.parent.parent.gameObject;
		PowerUpGameObject.SetActive (false);
	}

}

