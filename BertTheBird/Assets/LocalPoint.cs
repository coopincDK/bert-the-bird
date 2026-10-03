using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class LocalPoint : MonoBehaviour {
	List<Transform> SpawnPositions;
	public GameObject CurrentPoint;
	
	void Awake () {
		SpawnPositions = new List<Transform> ();
		foreach (Transform child in transform) {
			SpawnPositions.Add(child);
		}
	}
	
	
	// Use this for initialization
	void OnEnable () {
		CurrentPoint.SetActive (true);
		CurrentPoint.transform.position = SpawnPositions [Random.Range (0, SpawnPositions.Count)].position;
	}
}
