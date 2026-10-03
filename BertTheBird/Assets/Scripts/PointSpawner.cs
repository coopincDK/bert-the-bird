using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class PointSpawner : MonoBehaviour {
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
		if (CurrentPoint != null) {
			ObjectPool.instance.PoolObject(CurrentPoint);
		}
		CurrentPoint = ObjectPool.instance.GetObjectForType ("Star", true);
		CurrentPoint.transform.position = SpawnPositions [Random.Range (0, SpawnPositions.Count)].position;
	}

	void OnDisable () {
		if (CurrentPoint != null) {
			ObjectPool.instance.PoolObject(CurrentPoint);
			CurrentPoint = null;
		}
	}
}
